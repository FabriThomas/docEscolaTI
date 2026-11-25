import { render, screen, fireEvent } from '@testing-library/react-native'
import { Text, TouchableOpacity } from 'react-native'
import { RascunhoProvider, useRascunho, reais, paraCentavos } from '../src/RascunhoContext'

it('reais mostra sem centavos quando e redondo', ()=>{
  expect(reais(165000)).toBe('1.650')
  expect(reais(165050)).toBe('1.650,50')
})

it('paraCentavos entende os jeitos que a pessoa digita', ()=>{
  expect(paraCentavos('1.650')).toBe(165000)
  expect(paraCentavos('1650,5')).toBe(165050)
  expect(paraCentavos('1650.50')).toBe(165050)
  expect(paraCentavos('R$ 99')).toBe(9900)
  expect(paraCentavos('')).toBeNull()
  expect(paraCentavos('abc')).toBeNull()
})

it('o rascunho guarda o que cada tela muda', async ()=>{
  function Tela(){
    const {anuncio, setAnuncio} = useRascunho()
    return (
      <TouchableOpacity onPress={()=> setAnuncio({...anuncio, titulo: 'Fonte 500W'})} accessibilityRole="button" accessibilityLabel="mudar">
        <Text>{anuncio.titulo || 'vazio'}</Text>
      </TouchableOpacity>
    )
  }
  await render(<RascunhoProvider><Tela/></RascunhoProvider>)
  expect(screen.getByText('vazio')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', {name: 'mudar'}))
  expect(screen.getByText('Fonte 500W')).toBeTruthy()
})
