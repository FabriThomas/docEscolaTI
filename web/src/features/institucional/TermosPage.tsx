import { Link } from 'react-router'
import { TextoLegal } from './TextoLegal'

/** Tela 046 · Termos de Uso (EDTS-297). Texto-base do protótipo + regras de negócio vigentes. */
export default function TermosPage() {
  return (
    <TextoLegal
      titulo="Termos de Uso"
      descricao="Regras para usar o Steely: cadastro, anúncios, negociações e moedas."
      atualizadoEm="09/11/2026"
      secoes={[
        {
          titulo: '1. Cadastro',
          texto: (
            <>
              <p>Você informa dados verdadeiros e mantém sua senha em sigilo. Uma conta por pessoa.</p>
              <p>É preciso ter 18 anos ou mais para criar uma conta.</p>
            </>
          ),
        },
        {
          titulo: '2. Anúncios',
          texto: (
            <>
              <p>Anúncios passam por moderação automática. Itens falsificados ou proibidos são removidos.</p>
              <p>Quem anuncia responde pela veracidade das informações, mesmo quando os campos foram sugeridos pelo laudo por IA.</p>
            </>
          ),
        },
        {
          titulo: '3. Negociações',
          texto: <p>Combine a entrega pelo chat do Steely. A plataforma não intermedia o transporte.</p>,
        },
        {
          titulo: '4. Moedas',
          texto: <p>As moedas ficam vinculadas à sua conta e ao seu CPF. Não é possível transferir saldo entre contas.</p>,
        },
        {
          titulo: '5. Privacidade',
          texto: (
            <p>
              O tratamento dos seus dados está descrito na{' '}
              <Link to="/privacidade" className="font-semibold text-brand underline underline-offset-2">
                Política de Privacidade
              </Link>
              .
            </p>
          ),
        },
      ]}
    />
  )
}
