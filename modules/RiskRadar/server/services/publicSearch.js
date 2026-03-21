async function searchPublicSources({ companyName, country }) {
  // TODO: 接入公开搜索与摘要（可替换为可用的搜索 API）
  return {
    sources: [],
    notes: `Public search not configured for ${companyName} (${country}).`,
  };
}

module.exports = {
  searchPublicSources,
};
