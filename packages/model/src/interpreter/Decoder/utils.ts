import type { Decoder } from '@principia/codec/Decoder'

import * as D from '@principia/codec/Decoder'

export function withConfig(config?: {
  message?: string
  label?: string
}): <D extends Decoder<any, any, any>>(d: D) => D {
  return (d) => {
    let mut_decoder = d
    if (config) {
      if (config.message) {
        mut_decoder = D.withMessage_(d, config.message) as any
      }
      if (config.label) {
        mut_decoder = {
          ...mut_decoder,
          label: config.label
        }
      }
    }
    return mut_decoder
  }
}
