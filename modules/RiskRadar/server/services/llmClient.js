const axios = require('axios');

function isEnabled() {
  if (typeof process.env.RISKRADAR_USE_LLM !== 'undefined') {
    return String(process.env.RISKRADAR_USE_LLM) === 'true';
  }
  return Boolean(process.env.LLM_BASE_URL && process.env.LLM_API_KEY && process.env.LLM_MODEL);
}

function getConfig() {
  return {
    baseUrl: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL,
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 20000),
  };
}

async function chat({ messages, temperature = 0.2 }) {
  const { baseUrl, apiKey, model, timeoutMs } = getConfig();
  if (!baseUrl || !apiKey || !model) {
    throw new Error('LLM config missing');
  }

  const res = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model,
      messages,
      temperature,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000,
    },
  );

  const content = res.data?.choices?.[0]?.message?.content;
  return String(content || '');
}

module.exports = {
  isEnabled,
  chat,
};
