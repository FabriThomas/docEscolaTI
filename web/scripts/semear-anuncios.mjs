// Cria anúncios de exemplo (dados inventados) no FastAPI local, que guarda os anúncios só em memória.
// Uso: npm run semear [-- http://127.0.0.1:8000]
// O token é assinado com o segredo de TESTE do backend/.env.example (SUPABASE_JWT_SECRET).
import { createHmac } from 'node:crypto'

const API = (process.argv[2] ?? process.env.API_URL ?? 'http://127.0.0.1:8000') + '/api/v1/anuncios/'
const SEGREDO = process.env.DEV_JWT_SECRET ?? 'troque-por-um-segredo-de-teste'

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url')
function token(sub, email) {
  const agora = Math.floor(Date.now() / 1000)
  const corpo = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, email, role: 'authenticated', aud: 'authenticated', iat: agora, exp: agora + 900 })}`
  return `${corpo}.${createHmac('sha256', SEGREDO).update(corpo).digest('base64url')}`
}

const maringa = { cidade: 'Maringá', estado: 'PR', latitude: -23.4075, longitude: -51.9389 }
const anuncios = [
  ['usr_ana', { titulo: 'RTX 3060 Ti 8 GB ASUS Dual', categoria: 'gpu', marca: 'ASUS', modelo_ou_sku: 'DUAL-RTX3060TI-O8G', condicao: 'SEMINOVO', preco_centavos: 175000, bairro_aproximado: 'Zona 7', descricao: 'Placa testada, sem mineração. Acompanha caixa.', specs: { VRAM: '8 GB GDDR6', TDP: '200 W' }, ...maringa }],
  ['usr_bruno', { titulo: 'Ryzen 5 5600 com cooler box', categoria: 'cpu', marca: 'AMD', modelo_ou_sku: '100-100000927BOX', condicao: 'USADO', preco_centavos: 62000, bairro_aproximado: 'Centro', specs: { Núcleos: '6', Threads: '12', Soquete: 'AM4' }, ...maringa }],
  ['usr_ana', { titulo: 'Kit 16 GB DDR4 3200 (2x8)', categoria: 'ram', marca: 'Kingston', condicao: 'USADO', preco_centavos: 18000, bairro_aproximado: 'Zona 7', specs: { Capacidade: '16 GB', Frequência: '3200 MHz' }, ...maringa }],
  ['usr_bruno', { titulo: 'SSD NVMe 1 TB', categoria: 'storage', marca: 'WD', condicao: 'SEMINOVO', preco_centavos: 32000, bairro_aproximado: 'Gleba Palhano', cidade: 'Londrina', estado: 'PR', latitude: -23.33, longitude: -51.18, specs: { Capacidade: '1 TB', Interface: 'PCIe 3.0 x4' } }],
  ['usr_ana', { titulo: 'Placa-mãe B550M AORUS Elite', categoria: 'motherboard', marca: 'Gigabyte', condicao: 'USADO', preco_centavos: 54000, bairro_aproximado: 'Zona 7', specs: { Soquete: 'AM4', Formato: 'Micro-ATX' }, ...maringa }],
  ['usr_bruno', { titulo: 'GTX 960 2 GB com defeito (artefatos)', categoria: 'gpu', marca: 'MSI', condicao: 'DEFEITO_SUCATA', preco_centavos: 9000, bairro_aproximado: 'Centro', descricao: 'Liga, mas mostra artefatos na tela. Boa para peças ou reciclagem.', specs: { VRAM: '2 GB GDDR5', TDP: '120 W' }, ...maringa }],
  ['usr_ana', { titulo: 'Fonte 650 W 80 Plus Bronze', categoria: 'psu', marca: 'Corsair', condicao: 'USADO', preco_centavos: 28000, bairro_aproximado: 'Batel', cidade: 'Curitiba', estado: 'PR', latitude: -25.44, longitude: -49.29, specs: { Potência: '650 W', Certificação: '80 Plus Bronze' } }],
]

const emails = { usr_ana: 'ana.pereira@exemplo.com', usr_bruno: 'bruno.lima@exemplo.com' }
let criados = 0
for (const [vendedor, dados] of anuncios) {
  const resposta = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(vendedor, emails[vendedor])}` },
    body: JSON.stringify(dados),
  })
  if (!resposta.ok) {
    console.error(`❌ ${dados.titulo}: ${resposta.status} ${await resposta.text()}`)
    process.exit(1)
  }
  criados++
}
console.log(`✅ ${criados} anúncios criados em ${API}`)
