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
app.use(express.static(path.join(__dirname, '../public')));

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

app.post('/api/gerar-treino', async (req, res) => {
  try {
    const treino = await gerarTreinoIA(req.body);
    res.json({ sucesso: true, treino });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/api/enviar-mfit', async (req, res) => {
  const { nomeAluno, treino } = req.body;
  if (!nomeAluno || !treino) return res.status(400).json({ sucesso: false, erro: 'nomeAluno e treino obrigatorios' });

  const email = process.env.MFIT_EMAIL;
  const senha = process.env.MFIT_SENHA;
  if (!email || !senha) return res.status(500).json({ sucesso: false, erro: 'Credenciais MFIT nao configuradas' });

  res.json({ sucesso: true, mensagem: 'Automacao iniciada!' });
  broadcast('info', '🤖 Iniciando automação MFIT...');

  criarTreinoNoMfit({
    email, senha, nomeAluno, treinoData: treino,
    onLog: (msg, tipo) => broadcast(tipo || 'info', msg)
  }).then(resultado => {
    if (resultado.sucesso) broadcast('ok', '🎉 Treino criado com sucesso no MFIT!');
    else broadcast('erro', '❌ ' + resultado.erro);
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    mfit_email: !!process.env.MFIT_EMAIL,
    mfit_senha: !!process.env.MFIT_SENHA
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Igor Ferreira Team — http://localhost:${PORT}`);
  console.log(`   Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`);
  console.log(`   MFIT: ${process.env.MFIT_EMAIL ? '✅' : '❌'}\n`);
});
