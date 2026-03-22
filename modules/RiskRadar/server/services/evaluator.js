const { MODES } = require('../../shared/constants');
const zh = require('../i18n/zh-CN/templates');
const en = require('../i18n/en-US/templates');
const { chat, isEnabled } = require('./llmClient');

function pickTemplates(locale) {
  return locale === 'en-US' ? en : zh;
}

function simpleRiskHeuristic(companyName) {
  const name = String(companyName || '').toLowerCase();
  if (name.includes('诈骗') || name.includes('scam')) return 'high';
  if (name.includes('投资') || name.includes('capital')) return 'medium';
  return 'low';
}

function buildBaseReport({ companyName, country, mode, locale }) {
  const templates = pickTemplates(locale);
  const riskLevel = simpleRiskHeuristic(companyName);
  const confidenceScore = riskLevel === 'high' ? 58 : riskLevel === 'medium' ? 66 : 74;

  return {
    company_name: companyName,
    country,
    mode,
    risk_level: riskLevel === 'low' ? (locale === 'en-US' ? 'Low' : '低') :
      riskLevel === 'medium' ? (locale === 'en-US' ? 'Medium' : '中') :
      (locale === 'en-US' ? 'High' : '高'),
    confidence_score: confidenceScore,
    summary: templates.defaultSummary(companyName),
    recommendation: templates.recommendations[riskLevel],
    key_risks: [],
  };
}

function addModeExtensions(base, mode, locale) {
  if (mode === MODES.QUICK) {
    return {
      ...base,
      should_continue: base.risk_level === (locale === 'en-US' ? 'High' : '高') ? (locale === 'en-US' ? 'No' : '否') : (locale === 'en-US' ? 'Yes' : '是'),
    };
  }

  if (mode === MODES.STANDARD) {
    return {
      ...base,
      team_background: locale === 'en-US' ? 'Pending data collection.' : '待补充团队背景。',
      public_opinion: locale === 'en-US' ? 'Pending public sentiment analysis.' : '待补充舆情分析。',
      risk_items: [],
    };
  }

  return {
    ...base,
    financial_inference: locale === 'en-US' ? 'Pending financial inference.' : '待补充财务能力推断。',
    business_model: locale === 'en-US' ? 'Pending business model analysis.' : '待补充商业模式分析。',
    industry_position: locale === 'en-US' ? 'Pending industry position analysis.' : '待补充行业地位分析。',
    multi_source_validation: locale === 'en-US' ? 'Pending multi-source validation.' : '待补充多源验证。',
  };
}

function buildSystemPrompt(locale) {
  if (locale === 'en-US') {
    return [
      'You are a top-tier due diligence analyst.',
      'Never fabricate information.',
      'Mark uncertainty clearly (possible/suspected).',
      'Separate verified facts from inferences.',
      'Output must be JSON only, no markdown.',
    ].join(' ');
  }
  return [
    '你是一名顶级的商业尽调分析师。',
    '不允许编造信息。',
    '不确定信息必须标注（可能/疑似）。',
    '区分已验证事实与推测判断。',
    '输出必须为 JSON，禁止使用 Markdown。',
  ].join('');
}

function buildUserPrompt({ companyName, country, mode, locale, sources }) {
  const lang = locale === 'en-US' ? 'English' : '中文';
  const modeText = mode === MODES.QUICK ? 'quick' : mode === MODES.STANDARD ? 'standard' : 'deep';
  const sourceLines = (sources || [])
    .slice(0, 8)
    .map((s, idx) => `${idx + 1}. ${s.title || 'source'} | ${s.source_url || ''} | ${s.snippet || ''}`)
    .join('\n');

  const schemaQuick = `{\n  \"company_name\":\"\",\n  \"country\":\"\",\n  \"mode\":\"quick\",\n  \"risk_level\":\"${locale === 'en-US' ? 'Low/Medium/High' : '低/中/高'}\",\n  \"confidence_score\":0,\n  \"summary\":\"\",\n  \"recommendation\":\"\",\n  \"key_risks\":[],\n  \"should_continue\":\"${locale === 'en-US' ? 'Yes/No' : '是/否'}\"\n}`;
  const schemaStandard = `{\n  \"company_name\":\"\",\n  \"country\":\"\",\n  \"mode\":\"standard\",\n  \"risk_level\":\"${locale === 'en-US' ? 'Low/Medium/High' : '低/中/高'}\",\n  \"confidence_score\":0,\n  \"summary\":\"\",\n  \"recommendation\":\"\",\n  \"key_risks\":[],\n  \"team_background\":\"\",\n  \"public_opinion\":\"\",\n  \"risk_items\":[]\n}`;
  const schemaDeep = `{\n  \"company_name\":\"\",\n  \"country\":\"\",\n  \"mode\":\"deep\",\n  \"risk_level\":\"${locale === 'en-US' ? 'Low/Medium/High' : '低/中/高'}\",\n  \"confidence_score\":0,\n  \"summary\":\"\",\n  \"recommendation\":\"\",\n  \"key_risks\":[],\n  \"financial_inference\":\"\",\n  \"business_model\":\"\",\n  \"industry_position\":\"\",\n  \"multi_source_validation\":\"\"\n}`;

  const schema = mode === MODES.QUICK ? schemaQuick : mode === MODES.STANDARD ? schemaStandard : schemaDeep;

  return [
    `Company: ${companyName}`,
    `Country: ${country}`,
    `Mode: ${modeText}`,
    `Output language: ${lang}`,
    'Return JSON ONLY following this schema:',
    schema,
    'If sources are empty, state that information is limited and mark uncertainty.',
    'Sources:',
    sourceLines || '(none)',
  ].join('\n');
}

function extractJson(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  const fenceMatch = trimmed.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  const jsonText = candidate.slice(first, last + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function normalizeRiskLevel(value, locale) {
  if (!value) return locale === 'en-US' ? 'Low' : '低';
  const v = String(value).toLowerCase();
  if (v.includes('high') || v.includes('高')) return locale === 'en-US' ? 'High' : '高';
  if (v.includes('medium') || v.includes('中')) return locale === 'en-US' ? 'Medium' : '中';
  return locale === 'en-US' ? 'Low' : '低';
}

function mergeWithBase(base, payload, locale) {
  return {
    ...base,
    ...payload,
    risk_level: normalizeRiskLevel(payload?.risk_level, locale),
    key_risks: Array.isArray(payload?.key_risks) ? payload.key_risks : base.key_risks,
    confidence_score: Number.isFinite(Number(payload?.confidence_score))
      ? Number(payload.confidence_score)
      : base.confidence_score,
  };
}

async function runEvaluation({ companyName, country, mode, locale, sources }) {
  const base = buildBaseReport({ companyName, country, mode, locale });

  if (!isEnabled()) {
    return addModeExtensions(base, mode, locale);
  }

  try {
    const system = buildSystemPrompt(locale);
    const user = buildUserPrompt({ companyName, country, mode, locale, sources });
    const text = await chat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      responseFormat: { type: 'json_object' },
    });
    const parsed = extractJson(text);
    if (!parsed) {
      const fallback = addModeExtensions(base, mode, locale);
      return {
        ...fallback,
        summary: String(text || fallback.summary).slice(0, 600),
      };
    }
    return mergeWithBase(base, parsed, locale);
  } catch {
    return addModeExtensions(base, mode, locale);
  }
}

module.exports = {
  runEvaluation,
};
