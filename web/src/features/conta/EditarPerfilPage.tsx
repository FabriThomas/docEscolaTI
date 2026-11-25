import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Check, Eye, Lock, MapPin, X } from 'lucide-react'
import { FOTO_MAX_BYTES, FOTO_TIPOS, editarPerfilSchema, type EditarPerfilInput } from '@steely/schemas'
import { useEditarPerfil, useEnviarFoto, usePerfil } from '@/api/conta'
import { mensagemDeErro } from '@/api/erros'
import { ApiError } from '@/api/http'
import { avisar } from '@/stores/avisos'
import { MetaPagina } from '@/components/MetaPagina'
import { Button } from '@/components/ui/Button'
import { CampoArea, CampoTexto } from '@/components/ui/Campo'
import { CaixaInfo, Cartao, Etiqueta } from '@/components/ui/Exibicao'
import { Avatar } from '@/components/ui/Marca'
import { Carregando } from '@/components/ui/Spinner'

/** Foto de perfil: valida tipo e tamanho antes de enviar. */
function TrocarFoto({ url, nome }: { url: string | null; nome: string }) {
  const entrada = useRef<HTMLInputElement>(null)
  const enviar = useEnviarFoto()
  const [erro, setErro] = useState<string | null>(null)

  function escolher(arquivo: File | undefined) {
    setErro(null)
    if (!arquivo) return
    if (!(FOTO_TIPOS as readonly string[]).includes(arquivo.type)) return setErro('Use uma foto JPG, PNG ou WebP.')
    if (arquivo.size > FOTO_MAX_BYTES) return setErro('A foto pode ter no máximo 5 MB.')
    enviar.mutate(arquivo, {
      onSuccess: () => avisar('Foto atualizada.'),
      onError: (e) => setErro(mensagemDeErro(e, 'Não foi possível enviar a foto.')),
    })
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar url={url} nome={nome} tamanho="lg" />
        <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border-3 border-app bg-brand text-on-brand">
          <Camera className="size-3.5" strokeWidth={2.2} />
        </span>
      </div>
      <input
        ref={entrada}
        id="foto-perfil"
        type="file"
        aria-label="Escolher nova foto de perfil"
        tabIndex={-1}
        accept={FOTO_TIPOS.join(',')}
        className="sr-only"
        onChange={(e) => {
          escolher(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <Button variant="ghost" className="text-13" loading={enviar.isPending} onClick={() => entrada.current?.click()} aria-describedby="foto-regras">
        Alterar foto
      </Button>
      <p id="foto-regras" className="text-11 font-medium text-muted">
        JPG, PNG ou WebP até 5 MB.
      </p>
      {erro && (
        <p role="alert" className="text-13 text-danger">
          {erro}
        </p>
      )}
    </div>
  )
}

/** Tela 053 · Editar perfil (STY011; RN04: contato nunca fica público). */
export default function EditarPerfilPage() {
  const navigate = useNavigate()
  const { data: perfil, isPending, isError, error } = usePerfil()
  const editar = useEditarPerfil()
  const { register, handleSubmit, formState, reset, control, setError } = useForm({
    resolver: zodResolver(editarPerfilSchema),
    mode: 'onTouched',
    defaultValues: { displayName: '', bio: '', region: '' },
  })
  const bio = useWatch({ control, name: 'bio' }) ?? ''

  useEffect(() => {
    if (perfil) reset({ displayName: perfil.displayName, bio: perfil.bio, region: perfil.region })
  }, [perfil, reset])

  if (isPending) return <Carregando />
  if (isError) return <CaixaInfo tom="danger" role="alert">{mensagemDeErro(error, 'Não foi possível carregar seu perfil.')}</CaixaInfo>

  function salvar(dados: EditarPerfilInput) {
    editar.mutate(dados, {
      onSuccess: () => {
        avisar('Perfil atualizado.')
        navigate('/perfil')
      },
      onError: (e) => {
        if (!(e instanceof ApiError)) return
        for (const [campo, mensagem] of Object.entries(e.errosPorCampo)) {
          if (campo === 'displayName' || campo === 'bio' || campo === 'region') setError(campo, { message: mensagem })
        }
      },
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <MetaPagina titulo="Editar perfil" privada />
      <div className="flex items-center gap-3">
        <Link
          to="/perfil"
          aria-label="Cancelar edição e voltar ao perfil"
          className="touch-target flex items-center justify-center rounded-sm border border-line text-fg hover:border-control"
        >
          <X aria-hidden="true" className="size-4" />
        </Link>
        <h1 className="font-title text-24 font-bold">Editar perfil</h1>
      </div>

      <TrocarFoto url={perfil.avatarUrl} nome={perfil.displayName} />

      <Cartao className="p-5 md:p-6">
        <form noValidate onSubmit={handleSubmit(salvar)} className="flex flex-col gap-5">
          {editar.isError && Object.keys(editar.error instanceof ApiError ? editar.error.errosPorCampo : {}).length === 0 && (
            <CaixaInfo tom="danger" role="alert">
              <span className="text-fg">{mensagemDeErro(editar.error, 'Não foi possível salvar. Tente de novo.')}</span>
            </CaixaInfo>
          )}
          <CampoTexto
            label="Nome de exibição"
            required
            maxLength={40}
            autoComplete="nickname"
            hint="Aparece no perfil, nos anúncios e no chat."
            error={formState.errors.displayName?.message}
            {...register('displayName')}
          />
          <CampoArea
            label="Sobre você"
            maxLength={160}
            rows={3}
            aside={
              <span className="text-11 font-medium text-muted" aria-hidden="true">
                {bio.length}/160
              </span>
            }
            hint={`${bio.length} de 160 caracteres.`}
            error={formState.errors.bio?.message}
            {...register('bio')}
          />
          <CampoTexto
            label="Região"
            required
            placeholder="Bairro, cidade – UF"
            autoComplete="address-level3"
            leading={<MapPin className="size-4" />}
            hint="Só o bairro aparece. Telefone, e-mail e endereço nunca ficam públicos."
            hintIcon={<Eye className="size-3.5" />}
            error={formState.errors.region?.message}
            {...register('region')}
          />
          <CampoTexto
            label="E-mail"
            value={perfil.emailMasked}
            readOnly
            leading={<Lock className="size-4 text-icon" />}
            trailing={perfil.emailVerified ? <Etiqueta icon={<Check className="size-3" strokeWidth={2.5} />} className="mr-2">Verificado</Etiqueta> : undefined}
            hint="Para trocar o e-mail, fale com o suporte pela Central de Ajuda."
          />

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 md:flex-row md:justify-end">
            <Button asChild variant="secondary">
              <Link to="/perfil">Cancelar</Link>
            </Button>
            <Button type="submit" loading={editar.isPending} icon={<Check aria-hidden="true" className="size-4" />}>
              Salvar alterações
            </Button>
          </div>
        </form>
      </Cartao>
    </div>
  )
}
