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

jest.mock('@nozbe/watermelondb/adapters/sqlite', ()=>{
  const LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default
  return function(opcoes){
    return new LokiJSAdapter({schema: opcoes.schema, useWebWorker: false, useIncrementalIndexedDB: false, extraLokiOptions: {autosave: false}})
  }
})

jest.mock('@react-native-community/netinfo', ()=> require('@react-native-community/netinfo/jest/netinfo-mock.js'))

require('@nozbe/watermelondb/utils/common/logger').default.silence()

ligarMock()
global.alert = jest.fn()
