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


app.post('/api/gerar-treino', async (req, res) => {
  try {
    const treino = await gerarTreinoIA(req.body);
    res.json({ sucesso: true, treino });
  } catch (err) {
