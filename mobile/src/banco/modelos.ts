import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export class Rota extends Model {
  static table = 'routes'

  @text('appointment_id') appointmentId!: string
  @text('polyline') polyline!: string
  @field('distancia_metros') distanciaMetros!: number
  @field('duracao_segundos') duracaoSegundos!: number
  @field('expira_em') expiraEm!: number
  @field('updated_at') atualizadoEm!: number
  @field('is_deleted') apagado!: boolean
}

export class Encontro extends Model {
  static table = 'appointments'

  @text('order_id') orderId!: string
  @text('meeting_point_id') pontoId!: string
  @text('status') status!: string
  @field('marcado_para') marcadoPara!: number
  @field('expira_em') expiraEm!: number
  @field('updated_at') atualizadoEm!: number
  @field('is_deleted') apagado!: boolean
}

export class PontoEncontro extends Model {
  static table = 'meeting_points'

  @text('nome') nome!: string
  @text('endereco') endereco!: string
  @field('latitude') latitude!: number
  @field('longitude') longitude!: number
  @field('expira_em') expiraEm!: number
  @field('updated_at') atualizadoEm!: number
  @field('is_deleted') apagado!: boolean
}

export class MutacaoPendente extends Model {
  static table = 'pending_mutations'

  @text('tipo') tipo!: string
  @text('caminho') caminho!: string
  @text('corpo') corpo!: string
  @text('idempotency_key') idempotencyKey!: string
  @text('jti') jti!: string | null
  @field('lido_em') lidoEm!: number
  @field('tentativas') tentativas!: number
  @field('updated_at') atualizadoEm!: number
  @field('is_deleted') apagado!: boolean
}
