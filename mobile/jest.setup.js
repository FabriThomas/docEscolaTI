const { ligarMock } = require('./src/mock')

jest.mock('expo-router', ()=> ({
  router: {replace: jest.fn(), push: jest.fn(), back: jest.fn()},
  useRouter: ()=> ({replace: jest.fn(), push: jest.fn(), back: jest.fn()}),
}))

jest.mock('expo-secure-store', ()=>{
  let guardado = {}
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
    setItemAsync: jest.fn(async (k, v)=>{ guardado[k] = v }),
    getItemAsync: jest.fn(async (k)=> guardado[k] == undefined ? null : guardado[k]),
    deleteItemAsync: jest.fn(async (k)=>{ delete guardado[k] }),
  }
})

jest.mock('expo-sqlite', ()=>{
  const iniciar = require('sql.js')
  return {
    openDatabaseAsync: async ()=>{
      const SQL = await iniciar()
      const db = new SQL.Database()
      function linhas(sql, params){
        const comando = db.prepare(sql)
        comando.bind(params || [])
        const lista = []
        while(comando.step()) lista.push(comando.getAsObject())
        comando.free()
        return lista
      }
      return {
        execAsync: async (sql)=>{ db.exec(sql) },
        runAsync: async (sql, params)=>{ db.run(sql, params || []) },
        getAllAsync: async (sql, params)=> linhas(sql, params),
        getFirstAsync: async (sql, params)=> linhas(sql, params)[0] || null,
      }
    }
  }
})

jest.mock('@react-native-community/netinfo', ()=> require('@react-native-community/netinfo/jest/netinfo-mock.js'))

ligarMock()
global.alert = jest.fn()
