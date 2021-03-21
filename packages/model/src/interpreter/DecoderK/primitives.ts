import type * as Alg from '../../algebra'
import type { DecoderKURI } from './HKT'
import type { Branded } from '@principia/base/Brand'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as D from '@principia/codec/DecoderK'
import * as FDE from '@principia/codec/FreeDecodeError'
import * as FS from '@principia/free/FreeSemigroup'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const PrimitivesDecoder = implementInterpreter<DecoderKURI, Alg.PrimitivesURI>()((_) => ({
  string: (config) => (env) => applyDecoderConfig(config?.config)(D.string(extractInfo(config)), env, {}),
  number: (config) => (env) => applyDecoderConfig(config?.config)(D.number(extractInfo(config)), env, {}),
  boolean: (config) => (env) => applyDecoderConfig(config?.config)(D.boolean(extractInfo(config)), env, {}),
  literal: (...values) => (config) => (env) =>
    applyDecoderConfig(config?.config)(D.literal(...values)(extractInfo(config)), env, {}),
  stringLiteral: (value, config) => (env) =>
    applyDecoderConfig(config?.config)(D.literal(value)(extractInfo(config)), env, {}),
  numberLiteral: (value, config) => (env) =>
    applyDecoderConfig(config?.config)(D.literal(value)(extractInfo(config)), env, {}),
  bigint: (config) => (env) =>
    applyDecoderConfig(config?.config)(
      pipe(
        D.string(),
        D.parse((M) => (a) => {
          try {
            return M.pure(BigInt(a))
          } catch (e) {
            return M.fail(
              FS.Combine(FS.Element(FDE.Leaf(a, 'integer string')), pipe(config, extractInfo, FDE.Info, FS.Element))
            )
          }
        })
      ),
      env,
      {}
    ),
  date: (config) => (env) =>
    applyDecoderConfig(config?.config)(
      pipe(
        D.string(),
        D.mapLeftWithInput((i, _) =>
          FS.Combine(FS.Element(FDE.Leaf(i, 'date string')), pipe(config, extractInfo, FDE.Info, FS.Element))
        ),
        D.parse((M) => (a) => {
          const d = new Date(a)
          return isNaN(d.getTime())
            ? M.fail(
                FS.Combine(FS.Element(FDE.Leaf(a, 'date string')), pipe(config, extractInfo, FDE.Info, FS.Element))
              )
            : M.pure(d)
        })
      ),
      env,
      {}
    ),
  array: (item, config) => (env) =>
    pipe(item(env), (decoder) =>
      applyDecoderConfig(config?.config)(D.array(decoder, extractInfo(config)), env, decoder)
    ),
  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (decoder) =>
      applyDecoderConfig(config?.config)(pipe(D.array(decoder), D.refine(A.isNonEmpty, 'NonEmptyArray')), env, decoder)
    ),
  tuple: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (decoders) => applyDecoderConfig(config?.config)(D.tuple(...decoders)() as any, env, decoders as any)
    ),
  keyof: (keys, config) => (env) =>
    applyDecoderConfig(config?.config)(
      pipe(
        D.string(),
        D.refine(
          (a): a is keyof typeof keys & string => Object.keys(keys).indexOf(a) !== -1,
          Object.keys(keys).join(' | ')
        )
      ),
      env,
      {}
    ),
  UUID: (config) => (env) =>
    applyDecoderConfig(config?.config)(
      pipe(
        D.string(),
        D.refine((a): a is Branded<string, Alg.UUIDBrand> => regexUUID.test(a), 'UUID', extractInfo(config))
      ),
      env,
      {}
    )
}))
