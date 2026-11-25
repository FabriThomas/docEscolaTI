/**
 * JWT HS256 de desenvolvimento, no formato do Supabase Auth (sub, email, role, aud=authenticated, exp).
 * Com VITE_DEV_JWT_SECRET igual ao SUPABASE_JWT_SECRET do backend local, o FastAPI aceita estes tokens.
 * Nunca use um segredo real aqui: o valor vai para o navegador.
 */
const codificador = new TextEncoder()

function base64url(dados: Uint8Array | string): string {
  const bytes = typeof dados === 'string' ? codificador.encode(dados) : dados
  let binario = ''
  bytes.forEach((b) => (binario += String.fromCharCode(b)))
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function assinarJwt(payload: Record<string, unknown>, segredo: string): Promise<string> {
  const conteudo = `${base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64url(JSON.stringify(payload))}`
  const chave = await crypto.subtle.importKey('raw', codificador.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const assinatura = new Uint8Array(await crypto.subtle.sign('HMAC', chave, codificador.encode(conteudo)))
  return `${conteudo}.${base64url(assinatura)}`
}

/** Id da sessão dentro do token (claim "sid"), ou do formato simples "mock.<id>". */
export function lerSessaoDoToken(token: string | undefined | null): string | null {
  if (!token) return null
  if (token.startsWith('mock.')) return token.slice(5)
  const partes = token.split('.')
  if (partes.length !== 3 || !partes[1]) return null
  try {
    const json = atob(partes[1].replace(/-/g, '+').replace(/_/g, '/'))
    return (JSON.parse(json) as { sid?: string }).sid ?? null
  } catch {
    return null
  }
}
