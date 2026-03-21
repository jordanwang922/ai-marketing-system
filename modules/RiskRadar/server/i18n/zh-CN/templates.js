module.exports = {
  defaultSummary: (companyName) => `对 ${companyName} 的公开信息进行了初步梳理，未发现足以直接定性的结论，建议结合多源信息进一步验证。`,
  recommendations: {
    low: '风险较低，可继续推进沟通。',
    medium: '存在一定风险，建议谨慎推进并补充核验。',
    high: '风险较高，建议暂缓或停止合作。',
  },
  quick: {
    proceed: '是否建议继续沟通',
  },
};
