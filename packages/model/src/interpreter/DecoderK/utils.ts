import type { Config } from '../../HKT'
import type { ErrorInfo } from '@principia/codec/DecodeErrors'

export function extractInfo(config?: Config<any, any, any, any>): ErrorInfo {
  return config ? { message: config?.message, id: config?.id, label: config?.name } : {}
}
