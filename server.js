require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const { gerarTreinoIA } = require('./ai-generator');
const { criarTreinoNoMfit, buscarAlunos, buscarExercicios } = require('./mfit-bot');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const clientes = new Set();
wss.on('connection', (ws) => {
  clientes.add(ws);
  ws.on('close', () => clientes.delete(ws));
});

function broadcast(tipo, msg) {
  const payload = JSON.stringify({ tipo, msg, ts: new Date().toLocaleTimeString('pt-BR') });
  for (const ws of clientes) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

// Cache em memoria para exercicios (evita login repetido)
let cacheExercicios = null;
let cacheExerciciosTs = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Busca alunos do MFIT
app.get('/api/alunos', async (req, res) => {
  try {
    broadcast('info', 'Buscando alunos no MFIT...');
    const email = process.env.MFIT_EMAIL;
    const senha = process.env.MFIT_SENHA;
    const resultado = await buscarAlunos({ email, senha, onLog: (m) => broadcast('info', m) });
    if (resultado.sucesso) {
      broadcast('ok', resultado.alunos.length + ' alunos carregados do MFIT!');
      res.json({ sucesso: true, alunos: resultado.alunos });
    } else {
      broadcast('erro', 'Erro ao buscar alunos: ' + resultado.erro);
      res.status(500).json({ sucesso: false, erro: resultado.erro });
    }
  } catch (err) {
    broadcast('erro', 'Erro: ' + err.message);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// Busca catalogo de exercicios do MFIT (com cache)
app.get('/api/exercicios', async (req, res) => {
  try {
    const agora = Date.now();
    const forceRefresh = req.query.refresh === '1';

    if (cacheExercicios && !forceRefresh && (agora - cacheExerciciosTs) < CACHE_TTL) {
      return res.json({ sucesso: true, exercicios: cacheExercicios, cache: true });
    }

    broadcast('info', 'Buscando exercicios no MFIT...');
    const email = process.env.MFIT_EMAIL;
    const senha = process.env.MFIT_SENHA;
    const resultado = await buscarExercicios({ email, senha, onLog: (m) => broadcast('info', m) });

    if (resultado.sucesso) {
      cacheExercicios = resultado.exercicios;
      cacheExerciciosTs = agora;
      broadcast('ok', resultado.exercicios.length + ' exercicios carregados do MFIT!');
      res.json({ sucesso: true, exercicios: resultado.exercicios, cache: false });
    } else {
      broadcast('erro', 'Erro ao buscar exercicios: ' + resultado.erro);
      res.status(500).json({ sucesso: false, erro: resultado.erro });
    }
  } catch (err) {
    broadcast('erro', 'Erro: ' + err.message);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/api/gerar-treino', async (req, res) => {
  try {
    broadcast('info', 'Gerando treino com IA...');
    const treino = await gerarTreinoIA(req.body);
    broadcast('ok', 'Treino gerado com sucesso!');
    res.json({ sucesso: true, treino });
  } catch (err) {
    broadcast('erro', 'Erro ao gerar treino: ' + err.message);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/api/enviar-mfit', async (req, res) => {
  try {
    broadcast('info', 'Conectando ao MFIT...');
    const email = process.env.MFIT_EMAIL;
    const senha = process.env.MFIT_SENHA;
    const resultado = await criarTreinoNoMfit({ ...req.body, email, senha, onLog: (m) => broadcast('info', m) });
    broadcast('ok', 'Treino enviado para o MFIT!');
    res.json({ sucesso: true, resultado });
  } catch (err) {
    broadcast('erro', 'Erro ao enviar para MFIT: ' + err.message);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

server.listen(PORT, () => {
  console.log('Servidor rodando na porta ' + PORT);
});
