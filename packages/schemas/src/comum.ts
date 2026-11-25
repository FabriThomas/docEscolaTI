import { z } from 'zod'

/** Regras comuns de formato (STY001, STY002, STY008). Mensagens em português do Brasil. */

export const MSG = {
  obrigatorio: 'Preencha este campo.',
  email: 'Informe um e-mail válido.',
  cpf: 'Informe um CPF válido.',
  data: 'Informe uma data válida no formato DD/MM/AAAA.',
  idade: 'É preciso ter 18 anos ou mais para criar uma conta.',
  codigo: 'O código tem 6 números.',
  senhasDiferentes: 'As senhas não conferem.',
} as const

export const apenasDigitos = (valor: string) => valor.replace(/\D/g, '')

/** Valida CPF pelos dígitos verificadores. Aceita com ou sem pontuação. */
export function cpfValido(valor: string): boolean {
  const cpf = apenasDigitos(valor)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digito = (base: string, pesoInicial: number) => {
    const soma = base.split('').reduce((acc, n, i) => acc + Number(n) * (pesoInicial - i), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  const d1 = digito(cpf.slice(0, 9), 10)
  const d2 = digito(cpf.slice(0, 10), 11)
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10])
}

/** 12345678909 → 123.456.789-09 (formata parcialmente enquanto digita). */
export function formatarCpf(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

/** 01022000 → 01/02/2000 (formata parcialmente enquanto digita). */
export function formatarData(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8)
  return d.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3')
}

/** "DD/MM/AAAA" → Date (UTC) ou null se a data não existir. */
export function lerData(valor: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim())
  if (!m) return null
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  const existe = data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  return existe ? data : null
}

/** Data de hoje no fuso de quem usa (meia-noite em UTC), para comparar com datas lidas por `lerData`. */
export function hojeLocal(agora = new Date()): Date {
  return new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()))
}

export function idadeEmAnos(nascimento: Date, hoje = hojeLocal()): number {
  let idade = hoje.getUTCFullYear() - nascimento.getUTCFullYear()
  const fezAniversario =
    hoje.getUTCMonth() > nascimento.getUTCMonth() ||
    (hoje.getUTCMonth() === nascimento.getUTCMonth() && hoje.getUTCDate() >= nascimento.getUTCDate())
  if (!fezAniversario) idade--
  return idade
}

export const IDADE_MINIMA = 18
export const SENHA_MIN = 10

/** Critérios de senha (STY001-RN03, STY008-RN02). A tela 054 fixa o mínimo de 10 caracteres. */
export const criteriosSenha = [
  { id: 'tamanho', rotulo: `${SENHA_MIN}+ caracteres`, teste: (s: string) => s.length >= SENHA_MIN },
  { id: 'maiuscula', rotulo: 'Letra maiúscula', teste: (s: string) => /[A-ZÀ-Ý]/.test(s) },
  { id: 'numero', rotulo: 'Número', teste: (s: string) => /\d/.test(s) },
  { id: 'especial', rotulo: 'Caractere especial', teste: (s: string) => /[^A-Za-zÀ-ÿ0-9\s]/.test(s) },
] as const

export const emailSchema = z
  .string({ error: MSG.obrigatorio })
  .trim()
  .min(1, { error: MSG.obrigatorio })
  .pipe(z.email({ error: MSG.email }))

export const cpfSchema = z
  .string({ error: MSG.obrigatorio })
  .trim()
  .min(1, { error: MSG.obrigatorio })
  .refine(cpfValido, { error: MSG.cpf })
  .transform(apenasDigitos)

export const senhaForteSchema = z
  .string({ error: MSG.obrigatorio })
  .min(1, { error: MSG.obrigatorio })
  .max(128, { error: 'Use no máximo 128 caracteres.' })
  .superRefine((senha, ctx) => {
    const falhou = criteriosSenha.filter((c) => !c.teste(senha))
    if (falhou.length) {
      ctx.addIssue({
        code: 'custom',
        message: `A senha precisa de: ${falhou.map((c) => c.rotulo.toLowerCase()).join(', ')}.`,
      })
    }
  })

/** Data de nascimento "DD/MM/AAAA" → ISO "AAAA-MM-DD", exigindo 18 anos (STY001-RN07). */
export const nascimentoSchema = z
  .string({ error: MSG.obrigatorio })
  .trim()
  .min(1, { error: MSG.obrigatorio })
  .superRefine((valor, ctx) => {
    const data = lerData(valor)
    if (!data || data.getTime() > hojeLocal().getTime()) {
      ctx.addIssue({ code: 'custom', message: MSG.data })
      return
    }
    if (idadeEmAnos(data) < IDADE_MINIMA) ctx.addIssue({ code: 'custom', message: MSG.idade })
  })
  .transform((valor) => (lerData(valor) as Date).toISOString().slice(0, 10))

export const codigoSchema = z
  .string({ error: MSG.obrigatorio })
  .trim()
  .regex(/^\d{6}$/, { error: MSG.codigo })
