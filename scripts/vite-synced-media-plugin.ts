import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

/**
 * Vite indexes `public/` once at dev startup. Images land in `public/media/` after
 * `sync-content` (or mid-session sync), so they 404 until restart. Serve `/media/*`
 * from disk when the file exists.
 */
export function syncedMediaDevPlugin(): Plugin {
  return {
    name: 'regaloskawaii-synced-media',
    apply: 'serve',
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          const raw = req.url?.split('?')[0];
          if (!raw?.startsWith('/media/') || raw.includes('..')) return next();

          const publicDir = server.config.publicDir;
          if (!publicDir) return next();

          const rel = decodeURIComponent(raw.slice(1));
          const file = path.normalize(path.join(publicDir, rel));
          const mediaRoot = path.normalize(path.join(publicDir, 'media'));
          if (!file.startsWith(mediaRoot + path.sep) && file !== mediaRoot) return next();

          let st;
          try {
            if (!existsSync(file)) return next();
            st = statSync(file);
          } catch {
            return next();
          }
          if (!st.isFile()) return next();

          const ext = path.extname(file).toLowerCase();
          res.statusCode = 200;
          res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
          res.setHeader('Content-Length', String(st.size));
          createReadStream(file).pipe(res);
        });
      };
    },
  };
}
