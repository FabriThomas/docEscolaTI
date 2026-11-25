// Gera os tipos da API a partir do snapshot do OpenAPI do FastAPI (ADR-13 e ADR-18):
//   src/api/schema.d.ts      tipos de todas as rotas (openapi-typescript)
//   src/api/rotas-backend.json  caminhos que o backend já implementa (o modo híbrido não simula esses)
// Uso: npm run api:types [caminho/do/openapi.snapshot.json]
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const snapshot = process.argv[2] ?? '../backend/openapi/openapi.snapshot.json'
const spec = JSON.parse(readFileSync(snapshot, 'utf8'))
execSync(`npx --yes openapi-typescript@7 "${snapshot}" -o src/api/schema.d.ts`, { stdio: 'inherit' })
const prefixo = '/api/v1'
const rotas = Object.keys(spec.paths)
  .filter((p) => p.startsWith(prefixo) && !/openapi|docs|redoc/.test(p))
  .map((p) => p.slice(prefixo.length))
writeFileSync('src/api/rotas-backend.json', JSON.stringify({ versao: spec.info?.version ?? '', rotas }, null, 2) + '\n')
console.log(`✅ ${rotas.length} rota(s) do backend: ${rotas.join(', ')}`)
