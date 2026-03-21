const axios = require('axios');

async function notifyCompletion(payload) {
  const url = process.env.CRM_NOTIFY_URL;
  if (!url) return;
  const token = process.env.CRM_NOTIFY_TOKEN;
  try {
    await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 5000,
    });
  } catch (err) {
    // Best-effort notify; avoid crashing worker
    // eslint-disable-next-line no-console
    console.warn('[RiskRadar] notify failed:', err?.message || err);
  }
}

module.exports = {
  notifyCompletion,
};
