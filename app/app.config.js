// app.json plus, for the PWA export only (tools/publish-pwa.sh), the web base URL.
// experiments.baseUrl also changes native export asset paths, so it is never set otherwise.
module.exports = ({ config }) =>
  process.env.PWA_BASE ? { ...config, experiments: { ...config.experiments, baseUrl: process.env.PWA_BASE } } : config;
