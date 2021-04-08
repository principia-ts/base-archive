import type * as Alg from '../../algebra'
import type { EncoderURI } from './HKT'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as E from '@principia/codec/Encoder'
import * as S from '@principia/base/Sync'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const PrimitivesEncoder = implementInterpreter<EncoderURI, Alg.PrimitivesURI>()((_) => ({
  string: (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  number: (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  boolean: (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  literal: (..._) => (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  stringLiteral: (value, config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  numberLiteral: (value, config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  bigint: (config) => (env) => applyEncoderConfig(config?.config)({ encode: (i) => S.succeed(i.toString()) }, env, {}),
  date: (config) => (env) => applyEncoderConfig(config?.config)({ encode: (d) => S.succeed(d.toISOString()) }, env, {}),
  array: (item, config) => (env) =>
    pipe(item(env), (encoder) => applyEncoderConfig(config?.config)(E.array(encoder), env, encoder)),
  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (encoder) => applyEncoderConfig(config?.config)(E.array(encoder), env, encoder)),
  tuple: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (encoders) => applyEncoderConfig(config?.config)(E.tuple(...(encoders as any)) as any, env, encoders as any)
    ),
  keyof: (keys, config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  UUID: (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {})
}))
