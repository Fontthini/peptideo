import { neon } from '@neondatabase/serverless';

function getDB() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL não configurada. Adicione Neon Postgres no painel da Vercel.');
  return neon(url);
}

export async function initDB() {
  const sql = getDB();
  await sql`
    CREATE TABLE IF NOT EXISTS cadastros (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      nome VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      whatsapp VARCHAR(50) NOT NULL,
      endereco TEXT NOT NULL,
      crm VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pendente',
      token TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function criarCadastro(data: {
  nome: string; sobrenome?: string; email: string; whatsapp: string; endereco: string; crm?: string; onde_conheceu?: string;
}) {
  const sql = getDB();
  const result = await sql`
    INSERT INTO cadastros (nome, email, whatsapp, endereco, crm)
    VALUES (${data.nome}, ${data.email}, ${data.whatsapp}, ${data.endereco}, ${data.crm || null})
    RETURNING *
  `;
  return result[0];
}

export async function listarCadastros() {
  const sql = getDB();
  return await sql`SELECT * FROM cadastros ORDER BY created_at DESC`;
}

export async function aprovarCadastro(id: string, token: string) {
  const sql = getDB();
  const result = await sql`
    UPDATE cadastros SET status = 'aprovado', token = ${token} WHERE id = ${id} RETURNING *
  `;
  return result[0];
}

export async function rejeitarCadastro(id: string) {
  const sql = getDB();
  const result = await sql`
    UPDATE cadastros SET status = 'rejeitado' WHERE id = ${id} RETURNING *
  `;
  return result[0];
}

export async function buscarPorToken(token: string) {
  const sql = getDB();
  const result = await sql`
    SELECT * FROM cadastros WHERE token = ${token} AND status = 'aprovado'
  `;
  return result[0] || null;
}

export async function buscarPorEmail(email: string) {
  const sql = getDB();
  const result = await sql`SELECT * FROM cadastros WHERE email = ${email}`;
  return result[0] || null;
}

export async function buscarPorId(id: string) {
  const sql = getDB();
  const result = await sql`SELECT * FROM cadastros WHERE id = ${id}`;
  return result[0] || null;
}
