import { mem_buscarMembroPorToken } from './db-memory';

function masterPassword(): string {
  return process.env.ADMIN_PASSWORD || '48139148';
}

// Aceita a senha mestra (compatibilidade com o login unico de sempre) OU o
// token de um membro da equipe com cargo "admin" — assim da para criar mais
// de um usuario com acesso total ao painel, cada um com seu proprio login.
export function isAdminKeyValid(key: string | null | undefined): boolean {
  if (!key) return false;
  if (key === masterPassword()) return true;
  const membro = mem_buscarMembroPorToken(key);
  return !!(membro && membro.ativo && membro.cargo === 'admin');
}

// Nome de quem fez a acao, para registrar no log — so deve ser chamado depois
// de confirmar isAdminKeyValid.
export function adminAtorFromKey(key: string | null | undefined): string {
  if (!key) return 'Desconhecido';
  if (key === masterPassword()) return 'Superadmin';
  const membro = mem_buscarMembroPorToken(key);
  return membro?.nome || 'Desconhecido';
}
