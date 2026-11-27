import { describe, expect, it } from 'vitest'
import {
  cadastroSchema,
  cpfValido,
  criteriosSenha,
  editarPerfilSchema,
  excluirContaSchema,
  formatarCpf,
  formatarData,
  idadeEmAnos,
  lerData,
  loginSchema,
  trocarSenhaSchema,
} from './index'

const anosAtras = (anos: number, dias = 0) => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - anos)
  d.setDate(d.getDate() + dias)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const cadastroValido = {
  fullName: 'Carla Mendes',
  email: 'carla@exemplo.com',
  cpf: '529.982.247-25',
  birthDate: '12/05/1994',
  password: 'Senha@Forte1',
  passwordConfirmation: 'Senha@Forte1',
  acceptTerms: true,
}

describe('CPF', () => {
  it('aceita CPF válido com ou sem pontuação', () => {
    expect(cpfValido('529.982.247-25')).toBe(true)
    expect(cpfValido('52998224725')).toBe(true)
  })
  it('recusa dígito verificador errado e sequências repetidas', () => {
    expect(cpfValido('529.982.247-26')).toBe(false)
    expect(cpfValido('111.111.111-11')).toBe(false)
    expect(cpfValido('123')).toBe(false)
  })
  it('formata enquanto digita', () => {
    expect(formatarCpf('5299822')).toBe('529.982.2')
    expect(formatarCpf('52998224725')).toBe('529.982.247-25')
    expect(formatarCpf('529982247259999')).toBe('529.982.247-25')
  })
})

describe('datas', () => {
  it('formata e lê DD/MM/AAAA', () => {
    expect(formatarData('12051994')).toBe('12/05/1994')
    expect(lerData('31/02/2000')).toBeNull()
    expect(lerData('29/02/2000')?.toISOString().slice(0, 10)).toBe('2000-02-29')
  })
  it('calcula a idade considerando o aniversário', () => {
    const hoje = new Date(Date.UTC(2026, 10, 17))
    expect(idadeEmAnos(new Date(Date.UTC(2008, 10, 17)), hoje)).toBe(18)
    expect(idadeEmAnos(new Date(Date.UTC(2008, 10, 18)), hoje)).toBe(17)
  })
})

describe('cadastro (STY001)', () => {
  it('aceita dados válidos e devolve CPF só com números e data em ISO', () => {
    const r = cadastroSchema.parse(cadastroValido)
    expect(r.cpf).toBe('52998224725')
    expect(r.birthDate).toBe('1994-05-12')
  })
  it('exige 18 anos (RN07)', () => {
    const r = cadastroSchema.safeParse({ ...cadastroValido, birthDate: anosAtras(18, 1) })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toMatch(/18 anos/)
    expect(cadastroSchema.safeParse({ ...cadastroValido, birthDate: anosAtras(18) }).success).toBe(true)
  })
  it('exige aceite dos termos (RN02) e senhas iguais', () => {
    const r = cadastroSchema.safeParse({ ...cadastroValido, acceptTerms: false, passwordConfirmation: 'outra' })
    const campos = r.error?.issues.map((i) => i.path[0])
    expect(campos).toContain('acceptTerms')
    expect(campos).toContain('passwordConfirmation')
  })
  it('lista os critérios de senha que faltam (RN03)', () => {
    const r = cadastroSchema.safeParse({ ...cadastroValido, password: 'curta', passwordConfirmation: 'curta' })
    expect(r.error?.issues.find((i) => i.path[0] === 'password')?.message).toBe(
      'A senha precisa de: 10+ caracteres, letra maiúscula, número, caractere especial.',
    )
    expect(criteriosSenha.every((c) => c.teste('Senha@Forte1'))).toBe(true)
  })
})

describe('login (STY002)', () => {
  it('aceita e-mail (normalizado) ou CPF (só números)', () => {
    expect(loginSchema.parse({ identifier: ' Ana@Exemplo.com ', password: 'x' }).identifier).toBe('ana@exemplo.com')
    expect(loginSchema.parse({ identifier: '529.982.247-25', password: 'x' }).identifier).toBe('52998224725')
  })
  it('recusa identificador inválido', () => {
    expect(loginSchema.safeParse({ identifier: 'ana', password: 'x' }).success).toBe(false)
  })
})

describe('conta', () => {
  it('nova senha diferente da atual (STY008-RN02)', () => {
    const r = trocarSenhaSchema.safeParse({ currentPassword: 'Senha@Forte1', newPassword: 'Senha@Forte1', newPasswordConfirmation: 'Senha@Forte1' })
    expect(r.error?.issues[0]?.message).toBe('A nova senha precisa ser diferente da atual.')
  })
  it('nome de exibição sem contato (STY011-RN04)', () => {
    expect(editarPerfilSchema.safeParse({ displayName: 'ana@x.com', bio: '', region: 'Centro' }).success).toBe(false)
    expect(editarPerfilSchema.safeParse({ displayName: 'Ana 44999998888', bio: '', region: 'Centro' }).success).toBe(false)
    expect(editarPerfilSchema.safeParse({ displayName: 'Ana P.', bio: '', region: 'Centro' }).success).toBe(true)
  })
  it('exclusão exige ciência, EXCLUIR e senha (STY010-RN03)', () => {
    expect(excluirContaSchema.safeParse({ acknowledge: true, confirmation: 'excluir', password: 'x' }).success).toBe(false)
    expect(excluirContaSchema.safeParse({ acknowledge: true, confirmation: 'EXCLUIR', password: 'x' }).success).toBe(true)
  })
})
