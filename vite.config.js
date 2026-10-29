import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { chooseRoute } from './api/route-core.js';

function localJevApi(apiKey) {
  return {
    name: 'local-jev-api',
    configureServer(server) {
      server.middlewares.use('/api/choose-route', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'POST required.' }));
          return;
        }
        try {
          let body = '';
          for await (const chunk of req) body += chunk;
          const result = await chooseRoute(JSON.parse(body), apiKey);
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (error) {
          res.writeHead(error.status || 502, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: error.message || 'Jev could not choose a route.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [react(), localJevApi(env.TYPESAFE_API_KEY)] };
});
