const puppeteer = require('puppeteer');

const MFIT_URL = 'https://app.mfitpersonal.com.br';
const MFIT_API = 'https://api.mfitpersonal.com.br';

/**
 * Faz login no MFIT e retorna o browser/page autenticado
 */
async function loginMfit(email, senha, onLog) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--window-size=1280,800'
    ]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  onLog('[MFIT] Abrindo pagina de login...');
  await page.goto(MFIT_URL + '/login', { waitUntil: 'networkidle2', timeout: 30000 });

  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
  const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
  await emailInput.click({ clickCount: 3 });
  await emailInput.type(email, { delay: 50 });

  const senhaInput = await page.$('input[type="password"]');
  await senhaInput.click({ clickCount: 3 });
  await senhaInput.type(senha, { delay: 50 });

  onLog('[MFIT] Fazendo login...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
    page.keyboard.press('Enter')
  ]);

  const url = page.url();
  if (url.includes('login')) {
    await browser.close();
    throw new Error('Login falhou - verifique email e senha do MFIT');
  }
  onLog('[MFIT] Login realizado com sucesso!');
  return { browser, page };
}

/**
 * Busca todos os alunos ativos do personal no MFIT via API
 */
async function buscarAlunos({ email, senha, onLog = console.log }) {
  let browser;
  try {
    const { browser: b, page } = await loginMfit(email, senha, onLog);
    browser = b;
    onLog('[MFIT] Buscando lista de alunos...');

    await page.goto('https://app.mfitpersonal.com.br/user/client/list', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForTimeout(2000);

    const data = await page.evaluate(async () => {
      const res = await fetch('https://api.mfitpersonal.com.br/user/client/?status=0&page=1&pageSize=100&search=', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });

    await browser.close();

    let alunos = [];
    if (Array.isArray(data)) alunos = data;
    else if (data.results) alunos = data.results;
    else if (data.clients) alunos = data.clients;
    else if (data.data) alunos = data.data;

    onLog('[MFIT] ' + alunos.length + ' alunos encontrados!');
    return { sucesso: true, alunos };
  } catch (err) {
    if (browser) await browser.close();
    onLog('[MFIT] Erro ao buscar alunos: ' + err.message);
    return { sucesso: false, erro: err.message, alunos: [] };
  }
}

/**
 * Busca o catalogo completo de exercicios do personal no MFIT via API
 */
async function buscarExercicios({ email, senha, onLog = console.log }) {
  let browser;
  try {
    const { browser: b, page } = await loginMfit(email, senha, onLog);
    browser = b;
    onLog('[MFIT] Buscando catalogo de exercicios...');

    await page.goto('https://app.mfitpersonal.com.br/user/client/list', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForTimeout(2000);

    let todosExercicios = [];
    let paginaAtual = 1;
    let temMais = true;

    while (temMais) {
      const pg = paginaAtual;
      const data = await page.evaluate(async (pg) => {
        const res = await fetch('https://api.mfitpersonal.com.br/user/exercise/?page=' + pg + '&pageSize=200&search=', {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }, pg);

      let exerciciosPagina = [];
      if (Array.isArray(data)) exerciciosPagina = data;
      else if (data.results) exerciciosPagina = data.results;
      else if (data.exercises) exerciciosPagina = data.exercises;
      else if (data.data) exerciciosPagina = data.data;

      todosExercicios = todosExercicios.concat(exerciciosPagina);

      if (exerciciosPagina.length < 200 || paginaAtual >= 10) {
        temMais = false;
      } else {
        paginaAtual++;
      }
    }

    await browser.close();
    onLog('[MFIT] ' + todosExercicios.length + ' exercicios encontrados!');
    return { sucesso: true, exercicios: todosExercicios };
  } catch (err) {
    if (browser) await browser.close();
    onLog('[MFIT] Erro ao buscar exercicios: ' + err.message);
    return { sucesso: false, erro: err.message, exercicios: [] };
  }
}

/**
 * Busca um aluno pelo nome dentro do MFIT
 */
async function buscarAluno(page, nomeAluno, onLog) {
  onLog('[MFIT] Buscando aluno: ' + nomeAluno);
  await page.goto('https://app.mfitpersonal.com.br/students', { waitUntil: 'networkidle2', timeout: 30000 });

  try {
    const searchInput = await page.$('input[placeholder*="buscar"], input[placeholder*="aluno"], input[type="search"]');
    if (searchInput) {
      await searchInput.type(nomeAluno, { delay: 80 });
      await page.waitForTimeout(1500);
    }
  } catch (e) {
    onLog('[MFIT] Campo de busca nao encontrado');
  }

  const alunoEncontrado = await page.evaluate((nome) => {
    const elementos = Array.from(document.querySelectorAll('*'));
    for (const el of elementos) {
      if (el.children.length === 0 && el.textContent.trim().toLowerCase().includes(nome.toLowerCase())) {
        const link = el.closest('a') || el.closest('[role="button"]') || el.closest('li') || el.closest('.card');
        if (link) { link.click(); return true; }
      }
    }
    return false;
  }, nomeAluno);

  if (!alunoEncontrado) {
    throw new Error('Aluno "' + nomeAluno + '" nao encontrado no MFIT.');
  }
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  onLog('[MFIT] Aluno encontrado: ' + nomeAluno);
}

/**
 * Cria uma nova rotina de treino no perfil do aluno
 */
async function criarRotinaTreino(page, nomeRotina, onLog) {
  onLog('[MFIT] Criando rotina: ' + nomeRotina);
  try {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button'));
      const btn = btns.find(b => b.textContent.toLowerCase().includes('treino'));
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);
  } catch(e) {}

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const btn = btns.find(b =>
      b.textContent.toLowerCase().includes('nova rotina') ||
      b.textContent.toLowerCase().includes('novo treino') ||
      b.textContent.toLowerCase().includes('adicionar') ||
      b.textContent.toLowerCase().includes('criar')
    );
    if (btn) btn.click();
  });
  await page.waitForTimeout(2000);

  try {
    const inputNome = await page.$('input[placeholder*="nome"], input[placeholder*="rotina"], input[name*="name"]');
    if (inputNome) {
      await inputNome.click({ clickCount: 3 });
      await inputNome.type(nomeRotina, { delay: 60 });
    }
  } catch(e) {}
  onLog('[MFIT] Rotina "' + nomeRotina + '" iniciada');
}

/**
 * Adiciona um exercicio ao treino
 */
async function adicionarExercicio(page, nomeExercicio, onLog, series, reps, descanso) {
  onLog('[MFIT] Adicionando exercicio: ' + nomeExercicio);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const btn = btns.find(b =>
      b.textContent.toLowerCase().includes('exercicio') ||
      b.textContent.toLowerCase().includes('adicionar') ||
      b.textContent === '+'
    );
    if (btn) btn.click();
  });
  await page.waitForTimeout(1500);

  try {
    const searchInput = await page.$('input[placeholder*="exercicio"], input[placeholder*="buscar"]');
    if (searchInput) {
      await searchInput.type(nomeExercicio, { delay: 80 });
      await page.waitForTimeout(1500);
      await page.evaluate((nome) => {
        const items = Array.from(document.querySelectorAll('li, [role="option"], .exercise-item'));
        const item = items.find(i => i.textContent.toLowerCase().includes(nome.toLowerCase().split(' ')[0]));
        if (item) item.click();
      }, nomeExercicio);
      await page.waitForTimeout(1000);
    }
  } catch(e) {}

  try {
    const inputs = await page.$$('input[type="number"]');
    if (inputs.length >= 1) { await inputs[0].click({ clickCount: 3 }); await inputs[0].type(String(series)); }
    if (inputs.length >= 2) { await inputs[1].click({ clickCount: 3 }); await inputs[1].type(String(reps)); }
    if (inputs.length >= 3) { await inputs[2].click({ clickCount: 3 }); await inputs[2].type(String(descanso)); }
  } catch(e) {}

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b =>
      b.textContent.toLowerCase().includes('salvar') ||
      b.textContent.toLowerCase().includes('confirmar') ||
      b.textContent.toLowerCase().includes('ok')
    );
    if (btn) btn.click();
  });
  await page.waitForTimeout(1000);
}

/**
 * Funcao principal: cria treino completo no MFIT para um aluno
 */
async function criarTreinoNoMfit({ email, senha, nomeAluno, treinoData, onLog = console.log }) {
  let browser;
  const log = [];
  try {
    const { browser: b, page } = await loginMfit(email, senha, onLog);
    browser = b;
    log.push('Login realizado');

    await buscarAluno(page, nomeAluno, onLog);
    log.push('Aluno "' + nomeAluno + '" encontrado');

    for (const dia of treinoData.dias) {
      await criarRotinaTreino(page, dia.nome, onLog);
      log.push('Rotina "' + dia.nome + '" criada');

      for (const exercicio of dia.exercicios) {
        await adicionarExercicio(
          page,
          exercicio.nome,
          onLog,
          exercicio.series,
          exercicio.repeticoes,
          exercicio.descanso_segundos || 60
        );
        log.push('  Exercicio: ' + exercicio.nome);
      }

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b =>
          b.textContent.toLowerCase().includes('salvar') ||
          b.textContent.toLowerCase().includes('concluir')
        );
        if (btn) btn.click();
      });
      await page.waitForTimeout(2000);
    }

    log.push('Treino criado com sucesso no MFIT!');
    await browser.close();
    return { sucesso: true, log };
  } catch (err) {
    if (browser) await browser.close();
    log.push('Erro: ' + err.message);
    return { sucesso: false, log, erro: err.message };
  }
}

module.exports = { criarTreinoNoMfit, buscarAlunos, buscarExercicios };
