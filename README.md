# Igor Ferreira Team — Gerador de Treinos IA + MFIT

Sistema que usa Claude IA para gerar treinos personalizados e automaticamente os cria no MFIT via Puppeteer.

---

## 🚀 COMO RODAR LOCALMENTE

### 1. Instale o Node.js
Baixe em: https://nodejs.org (versão 18+)

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

Edite o `.env` com seus dados reais:
```
ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
MFIT_EMAIL=seu-email@exemplo.com
MFIT_SENHA=sua-senha-do-mfit
PORT=3000
```

**Onde pegar a chave da Anthropic:**
Acesse https://console.anthropic.com → API Keys → Create Key

### 4. Rode o servidor
```bash
npm start
```

### 5. Acesse no navegador
```
http://localhost:3000
```

---

## ☁️ DEPLOY NO RAILWAY (recomendado)

### Passo a passo:

1. **Crie conta gratuita** em https://railway.app

2. **Instale o Railway CLI** (opcional, mas facilita):
```bash
npm install -g @railway/cli
railway login
```

3. **Suba o projeto:**
```bash
railway init
railway up
```

4. **Configure as variáveis de ambiente no Railway:**
   - Acesse seu projeto no dashboard do Railway
   - Clique em "Variables"
   - Adicione:
     - `ANTHROPIC_API_KEY` = sua chave
     - `MFIT_EMAIL` = seu email do MFIT
     - `MFIT_SENHA` = sua senha do MFIT

5. **Acesse a URL gerada** pelo Railway (ex: `https://seu-app.railway.app`)

---

## 📁 ESTRUTURA DO PROJETO

```
mfit-automation/
├── public/
│   └── index.html        # Interface web
├── src/
│   ├── server.js         # Servidor Express
│   ├── ai-generator.js   # Integração Claude IA
│   └── mfit-bot.js       # Automação Puppeteer
├── .env.example          # Variáveis de exemplo
├── .gitignore
└── package.json
```

---

## ⚙️ COMO FUNCIONA

1. **Você preenche** os dados do aluno no formulário
2. **A IA (Claude)** gera um treino completo em formato JSON estruturado
3. **Você revisa** o treino gerado na tela
4. **Clica "Enviar pro MFIT"** — o Puppeteer faz login no MFIT e cria o treino automaticamente no perfil do aluno
5. **Também pode** copiar ou enviar via WhatsApp

---

## ⚠️ IMPORTANTE SOBRE A AUTOMAÇÃO MFIT

A automação usa Puppeteer para simular um usuário navegando no MFIT. Isso significa:
- O aluno **precisa existir** no seu MFIT com o nome exato digitado
- Se a MFIT atualizar o layout, pode precisar de ajustes no bot
- A automação pode levar 30-60 segundos para completar

---

## 🆘 SUPORTE

Se tiver problemas, verifique:
1. Node.js versão 18+ instalado
2. `.env` configurado corretamente
3. Aluno cadastrado no MFIT com nome igual ao digitado
