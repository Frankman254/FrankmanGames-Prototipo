/// <reference types="node" />
// `npm run music:check`: revisa la música por defecto y cada perfil de zona de
// data/audio/music.json. Sale con error si alguna nota cae fuera de su escala o si
// se pasa de los topes de notas, voces o duración (src/audio/musicCheck.ts).
import { loadAudioData } from '../src/audio/data';
import { auditMusic } from '../src/audio/musicCheck';
import { musicFor } from '../src/audio/score';

const music = loadAudioData().music;
let bad = 0;
for (const id of [null, ...Object.keys(music.profiles)]) {
  const problems = auditMusic(musicFor(music, id), 128);
  console.log(`${id ?? 'por defecto'}: ${problems.length === 0 ? 'bien' : `${problems.length} problemas`}`);
  for (const p of problems.slice(0, 10)) console.log(`  ${p}`);
  bad += problems.length;
}
if (bad > 0) process.exit(1);
