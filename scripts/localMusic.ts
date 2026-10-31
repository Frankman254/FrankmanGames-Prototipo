// Música local de pruebas, FUERA del repositorio (sólo `vite serve`, nunca en el
// build). Sirve la carpeta `../FrankmanGames-MusicaPruebas/` (o la de la
// variable de entorno FMG_MUSIC_DIR) en la ruta `/__local-music/`. Ahí van las
// canciones y `local.json` (ver src/audio/localMusic.ts). Nada de esa carpeta
// entra en git ni en el juego empaquetado.
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

export const LOCAL_MUSIC_ROUTE = '/__local-music/';

const TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
  '.aac': 'audio/aac', '.flac': 'audio/flac', '.webm': 'audio/webm', '.opus': 'audio/ogg', '.json': 'application/json',
};

export function localMusicPlugin(dir = process.env['FMG_MUSIC_DIR'] ?? path.resolve(process.cwd(), '..', 'FrankmanGames-MusicaPruebas')): Plugin {
  return {
    name: 'fmg-local-music',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(LOCAL_MUSIC_ROUTE)) return next();
        const name = decodeURIComponent(req.url.slice(LOCAL_MUSIC_ROUTE.length).split('?')[0] ?? '');
        // Sólo nombres de archivo dentro de la carpeta: nada de rutas ni `..`.
        if (!name || /[\/]|\.\./.test(name)) {
          res.statusCode = 400;
          return res.end();
        }
        const file = path.join(dir, name);
        if (!existsSync(file) || !statSync(file).isFile()) {
          res.statusCode = 404;
          return res.end();
        }
        res.setHeader('Content-Type', TYPES[path.extname(name).toLowerCase()] ?? 'application/octet-stream');
        res.setHeader('Content-Length', statSync(file).size);
        res.setHeader('Cache-Control', 'no-store');
        createReadStream(file).pipe(res);
      });
    },
  };
}
