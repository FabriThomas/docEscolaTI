import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import schema from './schema'
import { Rota, Encontro, PontoEncontro, MutacaoPendente } from './modelos'

const HORA = 60 * 60 * 1000

export const VALIDADE = {
  routes: 24 * HORA,
  appointments: 1 * HORA,
  meeting_points: 7 * 24 * HORA,
}

const adaptador = new SQLiteAdapter({
  schema: schema,
  dbName: 'steely',
  jsi: true,
  onSetUpError: ()=>{
    alert('erro ao abrir o banco do aparelho, feche e abra o app de novo')
  }
})

export const banco = new Database({
  adapter: adaptador,
  modelClasses: [Rota, Encontro, PontoEncontro, MutacaoPendente],
})

export function expirou(registro: any){
  return !registro.expiraEm || registro.expiraEm < Date.now()
}
