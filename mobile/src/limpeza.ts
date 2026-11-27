import { zerarBanco } from './banco'
import { apagarChaves } from './secureStorage'

export async function limparAparelho(){
  await apagarChaves()
  try{
    await zerarBanco()
  }catch(e){
  }
}
