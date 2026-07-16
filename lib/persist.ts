import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// On Vercel the project root is read-only; use /tmp for writable scratch space
const DATA_DIR = process.env.VERCEL
  ? join('/tmp', 'peptidez-data')
  : join(process.cwd(), 'data');

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export function salvarJSON(filename: string, data: unknown) {
  try {
    ensureDir();
    writeFileSync(join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`[PERSIST] Erro ao salvar ${filename}:`, e);
  }
}

export function carregarJSON<T>(filename: string): T | null {
  try {
    const path = join(DATA_DIR, filename);
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch (e) {
    console.error(`[PERSIST] Erro ao carregar ${filename}:`, e);
  }
  return null;
}
