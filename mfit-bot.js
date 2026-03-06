const puppeteer = require('puppeteer');

const MFIT_URL = 'https://app.mfitpersonal.com.br';

/**
 * Faz login no MFIT e retorna o browser/page autenticado
 */
async function loginMfit(email, senha, onLog) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.CHROMIUM_PATH || undefined,
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

  onLog('[MFIT] Abrindo página de login...');
  await page.goto(`${MFIT_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });

  // Preenche email e senha
  await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="e-mail"], input[placeholder*="Email"]', { timeout: 10000 });
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

  // Verifica se login foi bem sucedido
  const url = page.url();
  if (url.includes('login')) {
    await browser.close();
    throw new Error('Login falhou — verifique email e senha do MFIT');
  }

  onLog('[MFIT] Login realizado com sucesso!');
  return { browser, page };
}

/**
 * Busca um aluno pelo nome dentro do MFIT
 */
async function buscarAluno(page, nomeAluno, onLog) {
  onLog(`[MFIT] Buscando aluno: ${nomeAluno}`);

  // Vai para a lista de alunos
  await page.goto(`${MFIT_URL}/students`, { waitUntil: 'networkidle2', timeout: 30000 });

  // Tenta usar campo de busca
  try {
    const searchInput = await page.$('input[placeholder*="buscar"], input[placeholder*="aluno"], input[placeholder*="pesquis"], input[type="search"]');
    if (searchInput) {
      await searchInput.type(nomeAluno, { delay: 80 });
      await page.waitForTimeout(1500);
    }
  } catch (e) {
    onLog('[MFIT] Campo de busca não encontrado, listando todos os alunos...');
  }

  // Clica no aluno encontrado
  const alunoEncontrado = await page.evaluate((nome) => {
    const elementos = Array.from(document.querySelectorAll('*'));
    for (const el of elementos) {
      if (el.children.length === 0 && el.textContent.trim().toLowerCase().includes(nome.toLowerCase())) {
        const link = el.closest('a') || el.closest('[role="button"]') || el.closest('li') || el.closest('.card');
        if (link) {
          link.click();
          return true;
        }
      }
    }
    return false;
  }, nomeAluno);

  if (!alunoEncontrado) {
    throw new Error(`Aluno "${nomeAluno}" não encontrado no MFIT. Verifique o nome exato.`);
  }

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  onLog(`[MFIT] Aluno encontrado: ${nomeAluno}`);
}

/**
 * Cria uma nova rotina de treino no perfil do aluno
 */
async function criarRotinaTreino(page, nomeRotina, onLog) {
  onLog(`[MFIT] Criando rotina: ${nomeRotina}`);

  // Procura aba ou botão de treinos no perfil do aluno
  try {
    await page.waitForSelector('[href*="treino"], [href*="workout"], button:has-text("Treino"), a:has-text("Treinos")', { timeout: 8000 });
    const treinoBtn = await page.$('[href*="treino"], [href*="workout"]') || await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('a, button'));
      return btns.find(b => b.textContent.toLowerCase().includes('treino'));
    });
    if (treinoBtn) await treinoBtn.click();
    await page.waitForTimeout(1500);
  } catch(e) {
    onLog('[MFIT] Navegando pela URL de treinos...');
  }

  // Clica em "Nova Rotina" ou "Adicionar"
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

  // Preenche nome da rotina
  try {
    const inputNome = await page.$('input[placeholder*="nome"], input[placeholder*="rotina"], input[name*="name"], input[name*="nome"]');
    if (inputNome) {
      await inputNome.click({ clickCount: 3 });
      await inputNome.type(nomeRotina, { delay: 60 });
    }
  } catch(e) {
    onLog('[MFIT] Campo de nome não encontrado automaticamente');
  }

  onLog(`[MFIT] Rotina "${nomeRotina}" iniciada`);
}

/**
 * Adiciona um exercício ao treino pelo nome (pesquisa)
 */
async function adicionarExercicio(page, nomeExercicio, onLog_unused, series, reps, descanso) {
  onLog(`[MFIT] Adicionando exercício: ${nomeExercicio}`);

  // Clica em "Adicionar exercício" ou "+"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const btn = btns.find(b =>
      b.textContent.toLowerCase().includes('exercício') ||
      b.textContent.toLowerCase().includes('adicionar') ||
      b.textContent === '+'
    );
    if (btn) btn.click();
  });

  await page.waitForTimeout(1500);

  // Pesquisa o exercício
  try {
    const searchInput = await page.$('input[placeholder*="exercício"], input[placeholder*="buscar"], input[placeholder*="procurar"]');
    if (searchInput) {
      await searchInput.type(nomeExercicio, { delay: 80 });
      await page.waitForTimeout(1500);

      // Clica no primeiro resultado
      await page.evaluate((nome) => {
        const items = Array.from(document.querySelectorAll('li, [role="option"], .exercise-item, .list-item'));
        const item = items.find(i => i.textContent.toLowerCase().includes(nome.toLowerCase().split(' ')[0]));
        if (item) item.click();
      }, nomeExercicio);

      await page.waitForTimeout(1000);
    }
  } catch(e) {
    onLog(`[MFIT] Não conseguiu buscar exercício "${nomeExercicio}" automaticamente`);
  }

  // Preenche séries, reps, descanso
  try {
    const inputs = await page.$$('input[type="number"], input[placeholder*="série"], input[placeholder*="repetição"], input[placeholder*="descanso"]');
    if (inputs.length >= 1) { await inputs[0].click({ clickCount: 3 }); await inputs[0].type(String(series)); }
    if (inputs.length >= 2) { await inputs[1].click({ clickCount: 3 }); await inputs[1].type(String(reps)); }
    if (inputs.length >= 3) { await inputs[2].click({ clickCount: 3 }); await inputs[2].type(String(descanso)); }
  } catch(e) {
    onLog('[MFIT] Campos de séries/reps não encontrados automaticamente');
  }

  // Salva o exercício
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.toLowerCase().includes('salvar') || b.textContent.toLowerCase().includes('confirmar') || b.textContent.toLowerCase().includes('ok'));
    if (btn) btn.click();
  });

  await page.waitForTimeout(1000);
}

/**
 * Função principal: executa toda a automação
 */
async function criarTreinoNoMfit({ email, senha, nomeAluno, treinoData, onLog = console.log }) {
  let browser;
  const log = [];

  try {
    const { browser: b, page } = await loginMfit(email, senha, onLog);
    browser = b;

    log.push('✅ Login realizado');

    await buscarAluno(page, nomeAluno, onLog);
    log.push(`✅ Aluno "${nomeAluno}" encontrado`);

    // Para cada dia de treino no JSON gerado
    for (const dia of treinoData.dias) {
      await criarRotinaTreino(page, dia.nome);
      log.push(`✅ Rotina "${dia.nome}" criada`);

      for (const exercicio of dia.exercicios) {
        await adicionarExercicio(
          page,
          exercicio.nome,
          exercicio.series,
          exercicio.repeticoes,
          exercicio.descanso_segundos || 60
        );
        log.push(`  ✅ Exercício: ${exercicio.nome}`);
      }

      // Salva a rotina
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.toLowerCase().includes('salvar') || b.textContent.toLowerCase().includes('concluir'));
        if (btn) btn.click();
      });
      await page.waitForTimeout(2000);
    }

    log.push('🎉 Treino criado com sucesso no MFIT!');
    await browser.close();
    return { sucesso: true, log };

  } catch (err) {
    if (browser) await browser.close();
    log.push(`❌ Erro: ${err.message}`);
    return { sucesso: false, log, erro: err.message };
  }
}

module.exports = { criarTreinoNoMfit };
