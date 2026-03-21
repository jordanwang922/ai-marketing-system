const axios = require('axios');

function isEnabled() {
  if (typeof process.env.PUBLIC_SEARCH_ENABLED !== 'undefined') {
    return String(process.env.PUBLIC_SEARCH_ENABLED) === 'true';
  }
  return true;
}

function decodeDuckDuckGoUrl(href) {
  if (!href) return null;
  const match = href.match(/uddg=([^&]+)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }
  if (href.startsWith('http')) return href;
  return null;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchText(url, timeoutMs, useJina) {
  const target = useJina ? `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}` : url;
  const res = await axios.get(target, { timeout: timeoutMs });
  const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  return stripHtml(text).slice(0, 800);
}

async function searchDuckDuckGo(query, maxResults, timeoutMs) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await axios.get(url, { timeout: timeoutMs });
  const html = String(res.data || '');
  const links = Array.from(html.matchAll(/class=\"result__a\"[^>]+href=\"([^\"]+)\"/g)).map((m) => m[1]);
  const urls = [];
  for (const href of links) {
    const decoded = decodeDuckDuckGoUrl(href);
    if (decoded && !urls.includes(decoded)) {
      urls.push(decoded);
    }
    if (urls.length >= maxResults) break;
  }
  return urls;
}

async function searchPublicSources({ companyName, country }) {
  if (!isEnabled()) {
    return { sources: [], notes: 'public search disabled' };
  }

  const timeoutMs = Number(process.env.PUBLIC_SEARCH_TIMEOUT_MS || 12000);
  const maxResults = Number(process.env.PUBLIC_SEARCH_MAX_RESULTS || 5);
  const useJina = String(process.env.PUBLIC_SEARCH_USE_JINA || 'true') === 'true';

  const query = `${companyName} ${country} 公司 风险 评价 负面`;
  const urls = await searchDuckDuckGo(query, maxResults, timeoutMs);

  const sources = [];
  for (const url of urls) {
    try {
      const snippet = await fetchText(url, timeoutMs, useJina);
      sources.push({
        source_type: 'public',
        source_url: url,
        title: url,
        snippet,
        weight: 2,
      });
    } catch {
      sources.push({
        source_type: 'public',
        source_url: url,
        title: url,
        snippet: '',
        weight: 1,
      });
    }
  }

  return { sources, notes: urls.length ? 'ok' : 'no results' };
}

module.exports = {
  searchPublicSources,
};
