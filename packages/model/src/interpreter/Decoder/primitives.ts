import type * as Alg from '../../algebra'
import type { UUIDE } from '../../algebra'
import type { DecoderURI } from './HKT'
import type { Branded } from '@principia/base/Brand'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import * as DE from '@principia/codec/DecodeError'
import * as D from '@principia/codec/Decoder'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  bigint: (config) => (env) => applyDecoderConfig(config?.config)(withConfig(config)(D.bigintFromString), env, {}),

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

  UUID: (config) => (env) =>
    applyDecoderConfig(config?.config)(
      pipe(
        D.string,
        D.refine(
          (a): a is Branded<string, Alg.UUIDBrand> => regexUUID.test(a),
          (s) => DE.leafE<UUIDE>({ _tag: 'UUIDE', actual: s }),
          () => O.None(),
          'UUID'
        ),
        withConfig(config)
      ),
      env,
      {}
    )
}))
