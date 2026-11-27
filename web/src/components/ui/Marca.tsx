import { useState } from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Logotipo Steely (texto + onda verde, como em docs/05-design/prototipos/00-logo.png). */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 164 40" role="img" aria-label="Steely" className={cn('h-8 w-auto', className)}>
      <text x="0" y="29" fill="currentColor" className="font-title" fontWeight="700" fontSize="30">
        Steely
      </text>
      {/* Onda verde à direita do nome, como na tela 01 (login) */}
      <path d="M106 25c6-9 11-9 16 0s10 9 15 0 10-9 15 0 7 6 10 2" fill="none" stroke="var(--st-green-500)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

type AvatarProps = { url?: string | null; nome: string; tamanho?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }

const tamanhos = { sm: 'size-10', md: 'size-16', lg: 'size-19', xl: 'size-24' }
const icones = { sm: 'size-5', md: 'size-8', lg: 'size-9', xl: 'size-11' }

/** Foto de perfil com borda verde (.avatar). Sem foto, mostra o ícone de usuário. */
export function Avatar({ url, nome, tamanho = 'sm', className }: AvatarProps) {
  const [falhou, setFalhou] = useState(false)
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-brand-line bg-raised',
        tamanhos[tamanho],
        className,
      )}
    >
      {url && !falhou ? (
        <img src={url} alt={`Foto de ${nome}`} className="size-full object-cover" onError={() => setFalhou(true)} />
      ) : (
        <User aria-hidden="true" className={cn('text-fg', icones[tamanho])} strokeWidth={1.75} />
      )}
    </span>
  )
}
