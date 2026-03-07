require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const { gerarTreinoIA } = require('./ai-generator');
const { criarTreinoNoMfit } = require('./mfit-bot');

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

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
    const resultado = await criarTreinoNoMfit(req.body, broadcast);
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
