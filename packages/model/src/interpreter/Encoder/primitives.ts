import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as E from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const PrimitivesEncoder = implementInterpreter<URI, Alg.PrimitivesURI>()((_) => ({
  string: (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  number: (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  boolean: (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  literal: (..._) => (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  stringLiteral: (value, config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  numberLiteral: (value, config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  bigint: (config) => (env) => applyEncoderConfig(config?.config)({ encode: (i) => i.toString() }, env, {}),
  date: (config) => (env) => applyEncoderConfig(config?.config)({ encode: (d) => d.toISOString() }, env, {}),
  array: (item, config) => (env) =>
    pipe(item(env), (encoder) => applyEncoderConfig(config?.config)(E.array(encoder), env, encoder)),
  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (encoder) => applyEncoderConfig(config?.config)(E.array(encoder), env, encoder)),
  keyof: (keys, config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  UUID: (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {})
}))
