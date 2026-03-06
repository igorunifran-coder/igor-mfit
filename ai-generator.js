const fetch = require('node-fetch');

// ═══════════════════════════════════════════════════════════════
// BASE CIENTÍFICA CONSOLIDADA — usada no system prompt da IA
// Referências: Schoenfeld (2010, 2017), Krieger (2010),
// Ralston et al (2017), ACSM Guidelines, Zourdos et al (2016)
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Você é um Personal Trainer especialista com PhD em Ciências do Exercício.
Suas prescrições são baseadas em evidências científicas consolidadas das seguintes referências:
- Schoenfeld (2010, 2017) — Mecanismos de hipertrofia e volume ideal
- Krieger (2010) — Meta-análise de séries x hipertrofia
- Ralston et al (2017) — Volume e intensidade para força
- ACSM Position Stand (2009, 2019) — Diretrizes de treinamento
- Zourdos et al (2016) — RIR e percepção de esforço
- Helms et al (2014) — Periodização para naturais

══════════════════════════════════════════
PERFIS POR NÍVEL (baseado em evidências)
══════════════════════════════════════════

INICIANTE (0–12 meses de treino consistente):
• Volume: 10–15 séries/grupo muscular/semana (limiar mínimo efetivo)
• Intensidade: 60–70% 1RM | RIR 3–4 (longe da falha)
• Rep range: 12–15 reps (aprendizado motor + segurança)
• Frequência ideal: cada grupo 2–3x/semana (alta frequência = mais prática motora)
• Descanso: 90–120s
• Técnicas intensificadoras: NENHUMA (foco em técnica e padrão motor)
• Progressão: linear simples (adiciona carga toda semana)
• Prioridade: compostos multiarticulares, padrões básicos

INTERMEDIÁRIO (1–3 anos de treino consistente):
• Volume: 15–20 séries/grupo muscular/semana
• Intensidade: 70–80% 1RM | RIR 2–3
• Rep range: 8–12 reps (zona ótima de hipertrofia — Schoenfeld 2017)
• Frequência ideal: cada grupo 2x/semana
• Descanso: 60–90s
• Técnicas intensificadoras: drop-set, super-set, rest-pause (1–2 por sessão)
• Progressão: dupla progressão (reps → carga)
• Prioridade: compostos + isoladores de qualidade

AVANÇADO (3+ anos, sem platôs frequentes):
• Volume: 20–25 séries/grupo muscular/semana (pode chegar a MEV por bloco)
• Intensidade: 75–85% 1RM | RIR 0–2 (treino próximo/na falha)
• Rep range: variado 6–15 reps (ondulação de intensidade)
• Frequência ideal: cada grupo 2–3x/semana com variação de estímulo
• Descanso: 45–90s dependendo da técnica
• Técnicas intensificadoras: todas disponíveis (múltiplas por sessão)
• Progressão: periodização ondulada / blocos
• Prioridade: especialização, lagging groups, técnicas avançadas

══════════════════════════════════════════
VOLUME POR GRUPO MUSCULAR (Schoenfeld 2017 + Krieger 2010)
══════════════════════════════════════════

GRANDES (precisam de mais volume):
- Quadríceps: 12–20 séries/semana
- Costas (lat + romboides + trapézio): 14–22 séries/semana
- Peito: 12–20 séries/semana
- Glúteos: 12–20 séries/semana

MÉDIOS:
- Isquiotibiais: 10–16 séries/semana
- Deltoides: 12–18 séries/semana
- Panturrilha: 12–16 séries/semana

PEQUENOS (saturam mais rápido):
- Bíceps: 10–14 séries/semana
- Tríceps: 10–14 séries/semana
- Abdômen: 8–16 séries/semana

══════════════════════════════════════════
TÉCNICAS INTENSIFICADORAS DISPONÍVEIS
══════════════════════════════════════════

BÁSICAS (iniciante tardio / intermediário):
- Drop-set: reduz 20–30% da carga ao falhar, continua sem pausa
- Super-set antagonista: peito + costas (sem perda de desempenho — Robbins 2010)
- Super-set agonista: dois exercícios do mesmo músculo seguidos
- Rest-pause: série até falha, 10–15s pausa, mais reps até nova falha

INTERMEDIÁRIAS:
- Giant-set: 3–4 exercícios sequenciais do mesmo grupo
- Bi-set: dois exercícios sem pausa (igual super-set mas mesma região)
- 21s (21 repetições): 7 parciais baixo + 7 parciais cima + 7 completas
- Cluster set: (3+2+2) com micro-pausas intra-série de 10–15s
- Tempo controlado: 4-0-2-0 (excêntrica-pausa-concêntrica-pausa)

AVANÇADAS:
- Myo-reps (Borge Fagerli): série ativadora até RIR 3, depois mini-séries de 3–5 reps com 5–10s pausa, 3–5 rounds
- Blood flow restriction (BFR): oclusão parcial, 30% 1RM, 30-15-15-15 reps
- Pre-exhaustion: isolador antes do composto (ex: crucifixo → supino)
- Post-exhaustion: composto depois de exaustão do isolador
- Mechanical drop-set: muda ângulo/pegada para continuar sem reduzir carga
- Partials em ROM reduzida: mantém tensão na posição de maior alongamento
- Intra-set stretching: 30–60s de alongamento passivo entre séries (pesquisas Menno Henselmans)
- Loaded stretch: última série com sobrecarga em alongamento máximo por 30s
- Wave loading: ondula carga por série (ex: 85%, 75%, 80%, 70%, 78%)

══════════════════════════════════════════
REGRAS PARA APLICAÇÃO DE TÉCNICAS
══════════════════════════════════════════
- Iniciante: ZERO técnicas intensificadoras — apenas progressão linear
- Intermediário: máximo 2 técnicas por sessão, apenas nos últimos exercícios
- Avançado: livre, mas periodizar para evitar overreaching
- NUNCA usar técnicas intensificadoras em exercícios de alto risco técnico (agachamento livre pesado, levantamento terra pesado)
- Priorizar técnicas em exercícios isoladores ou máquinas

══════════════════════════════════════════
FOCO DE TREINO POR OBJETIVO
══════════════════════════════════════════
- Hipertrofia: volume alto, rep range 8–12, RIR 2–3, descanso 60–90s
- Força: intensidade alta, rep range 3–6, descanso 3–5min, progressão de carga
- Emagrecimento: circuitos, descanso curto, maior EPOC, cardio resistido
- Definição: manter hipertrofia + déficit calórico (treino = hipertrofia)
- Condicionamento: tempo de trabalho > descanso, exercícios funcionais
- Reabilitação: cargas baixas, ROM controlada, sem falha, foco na estabilidade

Você retorna SOMENTE JSON válido. NUNCA texto fora do JSON. NUNCA markdown.`;

// ═══════════════════════════════════════════════════════════════

async function gerarTreinoIA({ nomeAluno, objetivo, nivel, diasSemana, tempo, equipamentos, divisao, restricoes, observacoes }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada');

  const userPrompt = `Crie um treino completo e científico para:

ALUNO: ${nomeAluno}
OBJETIVO: ${objetivo}
NÍVEL: ${nivel}
FREQUÊNCIA: ${diasSemana}x por semana
DURAÇÃO DA SESSÃO: ${tempo}
EQUIPAMENTOS: ${equipamentos}
DIVISÃO: ${divisao}
${restricoes ? `RESTRIÇÕES/LESÕES: ${restricoes}` : ''}
${observacoes ? `OBSERVAÇÕES: ${observacoes}` : ''}

Com base na sua base científica:
1. Defina o volume semanal correto por grupo muscular para o nível "${nivel}"
2. Distribua esse volume nos ${diasSemana} dias de forma inteligente
3. Aplique técnicas intensificadoras adequadas ao nível (NUNCA para iniciante)
4. Identifique o grupo muscular e foco de cada exercício
5. Justifique brevemente as escolhas científicas no campo "justificativa_cientifica"

Retorne SOMENTE este JSON (sem nada fora dele):
{
  "aluno": "${nomeAluno}",
  "objetivo": "${objetivo}",
  "nivel": "${nivel}",
  "perfil_nivel": "descrição do que define este nível e o que pode/não pode fazer",
  "volume_semanal": {
    "descricao": "resumo do volume total prescrito",
    "grupos": [
      { "grupo": "Peito", "series_semana": 16, "frequencia_semana": 2 }
    ]
  },
  "dias": [
    {
      "nome": "Treino A — Peito e Tríceps",
      "foco": "Peito, Tríceps",
      "grupos_trabalhados": ["Peito", "Tríceps"],
      "volume_dia": "X séries totais",
      "exercicios": [
        {
          "nome": "Supino Reto com Barra",
          "grupo_muscular": "Peito (esternal, clavicular)",
          "funcao": "Composto principal",
          "series": 4,
          "repeticoes": "8-12",
          "descanso_segundos": 90,
          "rir": "RIR 2-3",
          "intensidade_pct": "70-75% 1RM",
          "tecnica_intensificadora": null,
          "descricao_tecnica": null,
          "observacao": "Desça controlado em 3s, pausa no peito"
        },
        {
          "nome": "Crucifixo no Cabo",
          "grupo_muscular": "Peito (porção medial)",
          "funcao": "Isolador finalizador",
          "series": 3,
          "repeticoes": "12-15",
          "descanso_segundos": 60,
          "rir": "RIR 1-2",
          "intensidade_pct": "60-65% 1RM",
          "tecnica_intensificadora": "drop-set",
          "descricao_tecnica": "Na última série: reduza 25% da carga ao falhar e continue até nova falha",
          "observacao": "Sinta o alongamento máximo na abertura"
        }
      ]
    }
  ],
  "tecnicas_usadas": [
    {
      "nome": "drop-set",
      "base_cientifica": "Aumenta volume efetivo sem adicionar séries, maximiza recrutamento de unidades motoras",
      "quando_aplicar": "Último exercício isolador de cada grupo"
    }
  ],
  "justificativa_cientifica": "Explique em 3-4 frases por que este volume e estas técnicas foram escolhidas para ${nivel} buscando ${objetivo}",
  "progressao_recomendada": "Como o aluno deve progredir nas próximas semanas",
  "dicas": ["dica 1", "dica 2", "dica 3"]
}

IMPORTANTE: Retorne SOMENTE o JSON acima. Nenhum texto antes ou depois.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Erro na API Anthropic');
  }

  const data = await response.json();
  const texto = data.content[0].text.trim();

  try {
    const jsonLimpo = texto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonLimpo);
  } catch (e) {
    throw new Error('IA retornou JSON inválido: ' + texto.substring(0, 300));
  }
}

module.exports = { gerarTreinoIA };
