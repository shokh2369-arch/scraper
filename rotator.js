const got = require('got');
const { HttpsProxyAgent } = require('https-proxy-agent');
const proxies = require('./proxies');

let idx = 0;

function nextProxy() {
  const p = proxies[idx];
  idx = (idx + 1) % proxies.length;
  return p;
}

async function fetchWithRotatingProxies(url) {
  for (let i = 0; i < proxies.length; i++) {
    const proxy = nextProxy();
    const proxyUrl = `http://${proxy.user}:${proxy.pass}@${proxy.ip}:${proxy.port}`;

    try {
      const response = await got(url, {
        responseType: 'text',
        timeout: { request: 15000 },
        retry: 0,
        throwHttpErrors: true,
        agent: { https: new HttpsProxyAgent(proxyUrl) },
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
          'cache-control': 'no-cache',
          pragma: 'no-cache',
          'upgrade-insecure-requests': '1',
        },
      });

      if (response.statusCode === 200 && response.body.length > 5000) {
        console.log(`✅ ${proxy.ip}:${proxy.port} OK`);
        return response.body;
      }

      console.log(`❌ ${proxy.ip}:${proxy.port} Status ${response.statusCode}`);
    } catch (err) {
      console.log(`❌ ${proxy.ip}:${proxy.port} ERROR`, err.message);
    }
  }

  return null;
}

module.exports = fetchWithRotatingProxies;
