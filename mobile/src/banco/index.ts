import * as SQLite from 'expo-sqlite'

const HORA = 60 * 60 * 1000

export const VALIDADE: any = {
  routes: 24 * HORA,
  appointments: 1 * HORA,
  meeting_points: 7 * 24 * HORA,
}

export const TABELAS = ['routes', 'appointments', 'meeting_points', 'pending_mutations']

const CRIAR = `
CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY NOT NULL,
  appointment_id TEXT,
  polyline TEXT,
  distancia_metros REAL,
  duracao_segundos REAL,
  expira_em INTEGER,
  updated_at INTEGER,
  is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_routes_appointment ON routes (appointment_id);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT,
  meeting_point_id TEXT,
  status TEXT,
  marcado_para INTEGER,
  expira_em INTEGER,
  updated_at INTEGER,
  is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_appointments_order ON appointments (order_id);

CREATE TABLE IF NOT EXISTS meeting_points (
  id TEXT PRIMARY KEY NOT NULL,
  nome TEXT,
  endereco TEXT,
  latitude REAL,
  longitude REAL,
  expira_em INTEGER,
  updated_at INTEGER,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pending_mutations (
  id TEXT PRIMARY KEY NOT NULL,
  tipo TEXT,
  caminho TEXT,
  corpo TEXT,
  idempotency_key TEXT,
  jti TEXT,
  lido_em INTEGER,
  tentativas INTEGER DEFAULT 0,
  updated_at INTEGER,
  is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pending_key ON pending_mutations (idempotency_key);

CREATE TABLE IF NOT EXISTS sync_info (
  chave TEXT PRIMARY KEY NOT NULL,
  valor TEXT
);
`

let conexao: any = null

export async function abrirBanco(){
  if(conexao) return conexao
  try{
    const db = await SQLite.openDatabaseAsync('steely.db')
    await db.execAsync('PRAGMA journal_mode = WAL;' + CRIAR)
    conexao = db
    return db
  }catch(e){
    alert('erro ao abrir o banco do aparelho, feche e abra o app de novo')
    throw e
  }
}

export async function salvar(tabela: string, dados: any){
  const db = await abrirBanco()
  const registro = {...dados, updated_at: dados.updated_at || Date.now(), is_deleted: dados.is_deleted ? 1 : 0}
  const colunas = Object.keys(registro)
  const sql = 'INSERT OR REPLACE INTO ' + tabela + ' (' + colunas.join(', ') + ') VALUES (' + colunas.map(()=> '?').join(', ') + ')'
  await db.runAsync(sql, colunas.map(c => registro[c]))
}

export async function listar(tabela: string){
  const db = await abrirBanco()
  return await db.getAllAsync('SELECT * FROM ' + tabela + ' WHERE is_deleted = 0')
}

export async function buscar(tabela: string, id: string){
  const db = await abrirBanco()
  return await db.getFirstAsync('SELECT * FROM ' + tabela + ' WHERE id = ?', [id])
}

export async function apagar(tabela: string, id: string){
  const db = await abrirBanco()
  await db.runAsync('DELETE FROM ' + tabela + ' WHERE id = ?', [id])
}

export async function contar(tabela: string){
  const db = await abrirBanco()
  const linha: any = await db.getFirstAsync('SELECT COUNT(*) as total FROM ' + tabela)
  return linha ? linha.total : 0
}

export async function lerInfo(chave: string){
  const db = await abrirBanco()
  const linha: any = await db.getFirstAsync('SELECT valor FROM sync_info WHERE chave = ?', [chave])
  return linha ? linha.valor : null
}

export async function salvarInfo(chave: string, valor: string){
  const db = await abrirBanco()
  await db.runAsync('INSERT OR REPLACE INTO sync_info (chave, valor) VALUES (?, ?)', [chave, valor])
}

export async function tirarVencidos(){
  const db = await abrirBanco()
  for(const tabela of ['routes', 'appointments', 'meeting_points']){
    await db.runAsync('DELETE FROM ' + tabela + ' WHERE expira_em < ?', [Date.now()])
  }
}

export async function zerarBanco(){
  const db = await abrirBanco()
  for(const tabela of TABELAS){
    await db.runAsync('DELETE FROM ' + tabela)
  }
  await db.runAsync('DELETE FROM sync_info')
}

export function expirou(registro: any){
  return !registro.expira_em || registro.expira_em < Date.now()
}
