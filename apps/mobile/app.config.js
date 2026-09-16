const config = require('./app.json');

/**
 * `experiments.baseUrl` serve só ao export web servido em `/app/` (infra/publish-web.sh define
 * WEB_BASE_URL). No app nativo ele entra no manifesto e muda a resolução de assets sem
 * necessidade, então fica fora do app.json.
 */
module.exports = () => {
  const baseUrl = process.env.WEB_BASE_URL;
  if (!baseUrl) return config;
  return {
    ...config,
    expo: { ...config.expo, experiments: { ...config.expo.experiments, baseUrl } },
  };
};
