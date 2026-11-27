import { Redirect } from 'expo-router'
import { useSessao } from '../src/SessaoContext'

export default function Inicio(){
  const {usuario, carregando} = useSessao()
  if(carregando) return null
  return <Redirect href={usuario ? '/perfil' : '/login'}/>
}
