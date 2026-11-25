import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'routes',
      columns: [
        {name: 'appointment_id', type: 'string', isIndexed: true},
        {name: 'polyline', type: 'string'},
        {name: 'distancia_metros', type: 'number'},
        {name: 'duracao_segundos', type: 'number'},
        {name: 'expira_em', type: 'number'},
        {name: 'updated_at', type: 'number'},
        {name: 'is_deleted', type: 'boolean'},
      ]
    }),
    tableSchema({
      name: 'appointments',
      columns: [
        {name: 'order_id', type: 'string', isIndexed: true},
        {name: 'meeting_point_id', type: 'string', isIndexed: true},
        {name: 'status', type: 'string'},
        {name: 'marcado_para', type: 'number'},
        {name: 'expira_em', type: 'number'},
        {name: 'updated_at', type: 'number'},
        {name: 'is_deleted', type: 'boolean'},
      ]
    }),
    tableSchema({
      name: 'meeting_points',
      columns: [
        {name: 'nome', type: 'string'},
        {name: 'endereco', type: 'string'},
        {name: 'latitude', type: 'number'},
        {name: 'longitude', type: 'number'},
        {name: 'expira_em', type: 'number'},
        {name: 'updated_at', type: 'number'},
        {name: 'is_deleted', type: 'boolean'},
      ]
    }),
    tableSchema({
      name: 'pending_mutations',
      columns: [
        {name: 'tipo', type: 'string'},
        {name: 'caminho', type: 'string'},
        {name: 'corpo', type: 'string'},
        {name: 'idempotency_key', type: 'string', isIndexed: true},
        {name: 'jti', type: 'string', isOptional: true},
        {name: 'lido_em', type: 'number'},
        {name: 'tentativas', type: 'number'},
        {name: 'updated_at', type: 'number'},
        {name: 'is_deleted', type: 'boolean'},
      ]
    }),
  ]
})
