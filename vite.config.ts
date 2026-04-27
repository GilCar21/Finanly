import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-netlify-functions',
        configureServer(server) {
          server.middlewares.use('/.netlify/functions/', async (req, res, next) => {
            const method = req.method ?? 'GET';
            const requestUrl = req.url ?? '/';
            const [pathname, rawQuery = ''] = requestUrl.split('?');
            const endpoint = pathname.replace(/^\/+/, '').split('/')[0];

            if (!endpoint) {
              next();
              return;
            }

            const functionPath = path.resolve(__dirname, 'netlify/functions', `${endpoint}.mjs`);

            try {
              await fs.access(functionPath);
            } catch {
              next();
              return;
            }

            try {
              const chunks: Buffer[] = [];

              for await (const chunk of req) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
              }

              const { handler } = await import(`${pathToFileURL(functionPath).href}?t=${Date.now()}`);
              const result = await handler({
                httpMethod: method,
                path: `/.netlify/functions/${endpoint}`,
                headers: req.headers,
                queryStringParameters: Object.fromEntries(new URLSearchParams(rawQuery).entries()),
                body: chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : null,
              });

              res.statusCode = result?.statusCode ?? 200;

              if (result?.headers) {
                for (const [key, value] of Object.entries(result.headers)) {
                  if (typeof value === 'string' || typeof value === 'number') {
                    res.setHeader(key, value);
                  }
                }
              }

              res.end(result?.body ?? '');
            } catch (error) {
              server.ssrFixStacktrace(error as Error);
              console.error('[local-netlify-functions]', error);
              const message =
                error instanceof Error && error.message
                  ? error.message
                  : 'Falha ao executar funcao local.';
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: message }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify; file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
