import { CODIGOS_ERRO } from '@steely/schemas'
import { ApiError } from './http'

const MENSAGENS: Record<string, string> = {
  [CODIGOS_ERRO.credenciaisInvalidas]: 'E-mail, CPF ou senha incorretos.',
  [CODIGOS_ERRO.captchaObrigatorio]: 'Confirme que você não é um robô para continuar.',
  [CODIGOS_ERRO.limiteTaxa]: 'Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo.',
  [CODIGOS_ERRO.contaNaoVerificada]: 'Sua conta ainda não foi verificada. Confirme o código enviado ao seu e-mail.',
  [CODIGOS_ERRO.contaSuspensa]: 'Sua conta está suspensa. Fale com o suporte pela Central de Ajuda.',
  [CODIGOS_ERRO.contaEmCarencia]: 'Sua conta está em processo de exclusão. Entre para reativá-la.',
  [CODIGOS_ERRO.emailOuCpfEmUso]: 'Já existe uma conta com este e-mail ou CPF.',
  [CODIGOS_ERRO.codigoInvalido]: 'Código incorreto. Confira e tente de novo.',
  [CODIGOS_ERRO.codigoExpirado]: 'Este código expirou. Peça um novo.',
  [CODIGOS_ERRO.linkInvalido]: 'Este link expirou ou já foi usado. Peça um novo.',
  [CODIGOS_ERRO.senhaAtualIncorreta]: 'A senha atual está incorreta.',
  [CODIGOS_ERRO.senhaRepetida]: 'Escolha uma senha que você não usou recentemente.',
  // Códigos do FastAPI (EDTS-374)
  UNAUTHENTICATED: 'Sua sessão expirou. Entre de novo.',
  TOKEN_EXPIRED: 'Sua sessão expirou. Entre de novo.',
  CAPTCHA_UNAVAILABLE: 'Não foi possível validar a verificação agora. Tente de novo em instantes.',
  IDEMPOTENCY_IN_PROGRESS: 'Sua ação anterior ainda está sendo processada. Aguarde um instante.',
}

/** Texto em português para mostrar ao usuário a partir de qualquer erro. */
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível concluir. Tente de novo.'): string {
  if (erro instanceof ApiError) {
    if (erro.code && MENSAGENS[erro.code]) return MENSAGENS[erro.code] as string
    if (erro.problema.detail) return erro.problema.detail
    if (erro.status >= 500) return 'O Steely está instável agora. Tente de novo em instantes.'
  }
  return padrao
}

export const ehCodigo = (erro: unknown, codigo: string) => erro instanceof ApiError && erro.code === codigo
