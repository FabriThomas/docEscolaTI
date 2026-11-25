import { Link } from 'react-router'
import { EyeOff } from 'lucide-react'
import { CaixaInfo } from '@/components/ui/Exibicao'
import { TextoLegal } from './TextoLegal'

/** Tela 047 · Política de Privacidade (EDTS-298; LGPD; ADR-07 e ADR-21). */
export default function PrivacidadePage() {
  return (
    <TextoLegal
      titulo="Política de Privacidade"
      descricao="Como o Steely coleta, usa e protege seus dados, e como exercer seus direitos pela LGPD."
      atualizadoEm="09/11/2026"
      destaque={
        <CaixaInfo icon={<EyeOff className="size-4" />}>
          <span className="text-14 text-fg">Seu endereço e telefone nunca aparecem para compradores.</span>
        </CaixaInfo>
      }
      secoes={[
        { titulo: 'Dados que coletamos', texto: <p>Nome, e-mail, CPF, data de nascimento, bairro e histórico de anúncios e negociações.</p> },
        { titulo: 'Como usamos', texto: <p>Para publicar anúncios, mediar negociações e prevenir fraudes.</p> },
        {
          titulo: 'Com quem compartilhamos',
          texto: (
            <p>
              Usamos o Cloudflare Turnstile para confirmar que quem acessa é uma pessoa. A Cloudflare atua como operadora e não recebe seu nome,
              e-mail ou CPF.
            </p>
          ),
        },
        {
          titulo: 'Por quanto tempo guardamos',
          texto: (
            <>
              <p>Depois da exclusão da conta, apagamos e-mail, telefone, senha, fotos e conversas.</p>
              <p>Dados fiscais das transações ficam guardados por 5 anos e registros de acesso por 12 meses, como exige a lei.</p>
            </>
          ),
        },
        {
          titulo: 'Seus direitos (LGPD)',
          texto: (
            <p>
              Você pode pedir acesso, correção ou exclusão dos seus dados em{' '}
              <Link to="/seguranca" className="font-semibold text-brand underline underline-offset-2">
                Configurações de segurança
              </Link>
              . A exclusão tem 30 dias de carência para você mudar de ideia.
            </p>
          ),
        },
      ]}
    />
  )
}
