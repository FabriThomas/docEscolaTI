import { banco } from './banco'
import { apagarChaves } from './secureStorage'

export async function limparAparelho(){
  await apagarChaves()
  try{
    await banco.write(async ()=>{
      await banco.unsafeResetDatabase()
    })
  }catch(e){
  }
}
