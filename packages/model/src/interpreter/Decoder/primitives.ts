import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'
import type { Branded } from '@principia/base/Brand'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as D from '@principia/codec/Decoder'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class UUIDE {
  readonly _tag = 'UUIDE'
  constructor(readonly actual: string) {}
}

export const PrimitivesDecoder = implementInterpreter<DecoderURI, Alg.PrimitivesURI>()((_) => ({
  string: (config) => (env) => applyDecoderConfig(config?.config)(withConfig(config)(D.string), env, {}),

  number: (config) => (env) => applyDecoderConfig(config?.config)(withConfig(config)(D.number), env, {}),

  boolean: (config) => (env) => applyDecoderConfig(config?.config)(withConfig(config)(D.boolean), env, {}),

  literal: (...values) => (config) => (env) =>
    applyDecoderConfig(config?.config)(withConfig(config)(D.literal(...values)), env, {}),

  stringLiteral: (value, config) => (env) =>
    applyDecoderConfig(config?.config)(withConfig(config)(D.literal(value)), env, {}),

  numberLiteral: (value, config) => (env) =>
    applyDecoderConfig(config?.config)(withConfig(config)(D.literal(value)), env, {}),

  bigint: (config) => (env) => applyDecoderConfig(config?.config)(withConfig(config)(D.bigint), env, {}),

  date: (config) => (env) => applyDecoderConfig(config?.config)(withConfig(config)(D.dateFromString), env, {}),

  array: (item, config) => (env) =>
    pipe(item(env), (decoder) =>
      applyDecoderConfig(config?.config)(withConfig(config)(D.fromArray(decoder)), env, decoder)
    ),

  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (decoder) =>
      applyDecoderConfig(config?.config)(withConfig(config)(D.fromNonEmptyArray(decoder)), env, decoder)
    ),

  tuple: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (decoders) =>
        applyDecoderConfig(config?.config)(withConfig(config)(D.fromTuple(...decoders)) as any, env, decoders as any)
    ),

  keyof: (keys, config) => (env) =>
    applyDecoderConfig(config?.config)(withConfig(config)(D.keyof(keys)) as any, env, {}),

  UUID: (config) => (env) =>
    applyDecoderConfig(config?.config)(
      pipe(
        D.string,
        D.refine(
          (a): a is Branded<string, Alg.UUIDBrand> => regexUUID.test(a),
          (s) => new UUIDE(s)
        ),
        withConfig(config)
      ),
      env,
      {}
    )
}))
