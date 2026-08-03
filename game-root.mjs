/** Resolve canonical game source — parent /home/potter when present, else eat-the-sounds/. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PARENT = path.resolve(HERE, '..');
const MARKER = 'ninjawhee-eat-the-sounds.html';

export function resolveGameRoot() {
  const env = process.env.GAME_ROOT;
  if (env && fs.existsSync(path.join(env, MARKER))) return path.resolve(env);
  if (fs.existsSync(path.join(PARENT, MARKER))) return PARENT;
  if (fs.existsSync(path.join(HERE, MARKER))) return HERE;
  return PARENT;
}

export const GAME_ROOT = resolveGameRoot();
export const GAME_CACHE = process.env.GAME_CACHE || 'cohesion3';
export const GAME_URL = process.env.GAME_URL
  || `http://127.0.0.1:8765/ninjawhee-eat-the-sounds.html?v=${GAME_CACHE}`;

export function gamePath(...parts) {
  return path.join(GAME_ROOT, ...parts);
}

export function readGameFile(name) {
  return fs.readFileSync(gamePath(name), 'utf8');
}