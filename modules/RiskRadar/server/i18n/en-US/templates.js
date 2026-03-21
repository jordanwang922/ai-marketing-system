module.exports = {
  defaultSummary: (companyName) => `Public information for ${companyName} has been briefly reviewed. No decisive conclusion was found; further multi-source verification is recommended.`,
  recommendations: {
    low: 'Risk appears low; you may proceed with communication.',
    medium: 'Some risks detected; proceed with caution and verify further.',
    high: 'High risk; consider pausing or stopping the cooperation.',
  },
  quick: {
    proceed: 'Should we continue the conversation',
  },
};
