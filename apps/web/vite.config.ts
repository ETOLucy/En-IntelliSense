import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

function englishDictionary() {
  const root = join(import.meta.dirname, '..', '..', 'node_modules', 'dictionary-en');
  return {
    name: 'english-dictionary-assets',
    configureServer(server: { middlewares: { use: (path: string, handler: (_request: unknown, response: { setHeader: (name: string, value: string) => void; end: (body: Buffer) => void }, next: () => void) => void) => void } }) {
      server.middlewares.use('/dictionary/en.aff', async (_request, response) => {
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        response.end(await readFile(join(root, 'index.aff')));
      });
      server.middlewares.use('/dictionary/en.dic', async (_request, response) => {
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        response.end(await readFile(join(root, 'index.dic')));
      });
    },
    async generateBundle(this: { emitFile: (file: { type: 'asset'; fileName: string; source: Buffer }) => void }) {
      this.emitFile({ type: 'asset', fileName: 'dictionary/en.aff', source: await readFile(join(root, 'index.aff')) });
      this.emitFile({ type: 'asset', fileName: 'dictionary/en.dic', source: await readFile(join(root, 'index.dic')) });
    },
  };
}

export default defineConfig({
  plugins: [react(), englishDictionary()],
  base: './',
  server: { port: 4173 },
  build: { outDir: 'dist', sourcemap: true },
});
