import type { DecoderURI } from './Modules'
import type { Result } from './Result2'
import type { CastToNumber } from './util'
import type { Either } from '@principia/base/Either'
import type { Lazy } from '@principia/base/function'
import type { Guard } from '@principia/base/Guard'
import type { Hash } from '@principia/base/Hash'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { Refinement } from '@principia/base/Refinement'
import type { RoseTree } from '@principia/base/RoseTree'
import type { FSync } from '@principia/base/Sync'
import type * as P from '@principia/base/typeclass'
import type { EnforceNonEmptyRecord, Mutable, Primitive, UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as B from '@principia/base/boolean'
import * as E from '@principia/base/Either'
import { flow, memoize, pipe } from '@principia/base/function'
import * as G from '@principia/base/Guard'
import * as HS from '@principia/base/HashSet'
import * as HKT from '@principia/base/HKT'
import * as N from '@principia/base/number'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import * as RT from '@principia/base/RoseTree'
import * as Set from '@principia/base/Set'
import * as Str from '@principia/base/string'
import * as Struct from '@principia/base/Struct'
import * as S from '@principia/base/Sync'

import * as DE from './DecodeError'
import * as Res from './Result2'
import { _intersect } from './util'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Decoder<I, E, A> {
  readonly label: string
  readonly decode: (i: I) => Result<E, A>
}

export type V = HKT.V<'I', '-'> & HKT.V<'E', '+'>

export interface UDecoder<E, A> extends Decoder<unknown, E, A> {}

export type InputOf<D> = D extends Decoder<infer I, any, any> ? I : never
export type ErrorOf<D> = D extends Decoder<any, infer E, any> ? E : never
export type TypeOf<D> = D extends Decoder<any, any, infer A> ? A : never

export type AnyD = Decoder<any, any, any>
export type AnyUD = UDecoder<any, any>

/*
 * -------------------------------------------
 * constructors
 * -------------------------------------------
 */

export interface FromParseD<I, E, A> extends Decoder<I, E, A> {
  readonly _tag: 'FromParseD'
  readonly parser: (i: I) => Result<E, A>
}

/**
 * Constructs a Decoder from a parsing function
 */
export function fromParse<I, E, A>(parser: (i: I) => Result<E, A>, label: string): FromParseD<I, E, A> {
  return {
    _tag: 'FromParseD',
    label,
    parser,
    decode: parser
  }
}

export interface FromRefinementD<I, E, A extends I> extends Decoder<I, E, A> {
  readonly _tag: 'FromRefinementD'
  readonly refinement: Refinement<I, A>
  readonly onError: (i: I) => E
}

/**
 * Constructs a Decoder from a type predicate
 */
export function fromRefinement<I, E, A extends I>(
  refinement: Refinement<I, A>,
  onError: (i: I) => E,
  label: string
): FromRefinementD<I, E, A> {
  return {
    _tag: 'FromRefinementD',
    label,
    refinement,
    onError,
    decode: (i) => (refinement(i) ? S.succeed([i, []]) : S.fail([onError(i), []]))
  }
}

/**
 * Constructs a Decoder from a Guard
 */
export function fromGuard<I, E, A extends I>(
  guard: Guard<I, A>,
  onError: (i: I) => E,
  label: string
): FromRefinementD<I, E, A> {
  return fromRefinement(guard.is, onError, label)
}

export interface LiteralD<A extends readonly [Primitive, ...ReadonlyArray<Primitive>]>
  extends UDecoder<DE.LeafE<DE.LiteralE<A[number]>>, A[number]> {
  readonly _tag: 'LiteralD'
  readonly literals: A
}

/**
 * Constructs a Decoder from one or more literals
 */
export function literal<A extends readonly [Primitive, ...ReadonlyArray<Primitive>]>(...literals: A): LiteralD<A> {
  const literalsGuard = G.literal(...literals)
  return {
    _tag: 'LiteralD',
    label: pipe(
      literals,
      A.map((l) => String(l)),
      A.join(' | ')
    ),
    literals,
    decode: (i) => (literalsGuard.is(i) ? S.succeed([i, []]) : S.fail([DE.leafE(DE.literalE(i, literals)), []]))
  }
}

/*
 * -------------------------------------------
 * primitives
 * -------------------------------------------
 */

export interface stringUD extends Decoder<unknown, DE.StringLE, string> {
  readonly _tag: 'stringUD'
}

export const string: stringUD = {
  ...fromGuard(Str.Guard, flow(DE.stringE, DE.leafE), 'string'),
  _tag: 'stringUD'
}

export interface numberUD extends Decoder<unknown, DE.NumberLE, number> {
  readonly _tag: 'numberUD'
}

export const number: numberUD = {
  ...fromGuard(N.Guard, flow(DE.numberE, DE.leafE), 'number'),
  _tag: 'numberUD'
}

export interface booleanUD extends Decoder<unknown, DE.BooleanLE, boolean> {
  readonly _tag: 'booleanUD'
}

export const boolean: booleanUD = {
  ...fromGuard(B.Guard, flow(DE.booleanE, DE.leafE), 'boolean'),
  _tag: 'booleanUD'
}

export interface bigintFromStringUD extends Decoder<unknown, DE.StringLE | DE.BigIntLE, bigint> {
  readonly _tag: 'bigintFromStringD'
}

export const bigintFromString: bigintFromStringUD = {
  _tag: 'bigintFromStringD',
  label: 'bigint',
  decode: (u) =>
    typeof u !== 'string'
      ? Res.fail(DE.leafE(DE.stringE(u)))
      : S.effectCatch_(
          () => [BigInt(u), []],
          (_) => [DE.leafE(DE.bigIntE(u)), []]
        )
}

/*
 * -------------------------------------------
 * unknown containters
 * -------------------------------------------
 */

export interface UnknownArrayUD extends Decoder<unknown, DE.UnknownArrayLE, ReadonlyArray<unknown>> {
  readonly _tag: 'UnknownArrayUD'
}

export const UnknownArray: UnknownArrayUD = {
  ...fromGuard(A.GuardUnknownArray, flow(DE.unknownArrayE, DE.leafE), 'Array<unknown>'),
  _tag: 'UnknownArrayUD'
}

export interface UnknownNonEmptyArrayUD
  extends Decoder<unknown, DE.UnknownArrayLE | DE.RefineE<DE.LeafE<DE.EmptyE>>, NonEmptyArray<unknown>> {
  readonly _tag: 'NonEmptyArrayUD'
}

export const UnknownNonEmptyArray: UnknownNonEmptyArrayUD = {
  ...pipe(
    UnknownArray,
    refine(
      (as: ReadonlyArray<unknown>): as is NonEmptyArray<unknown> => as.length > 0,
      flow(DE.emptyE, DE.leafE),
      'NonEmptyArray<unknown>'
    ),
    Struct.pick('label', 'decode')
  ),
  _tag: 'NonEmptyArrayUD'
}

export interface UnknownRecordUD
  extends Decoder<unknown, DE.LeafE<DE.UnknownRecordE>, ReadonlyRecord<string, unknown>> {
  readonly _tag: 'UnknownRecordUD'
}

export const UnknownRecord: UnknownRecordUD = {
  ...fromGuard(R.GuardUnknownRecord, flow(DE.unknownRecordE, DE.leafE), 'Record<string, unknown>'),
  _tag: 'UnknownRecordUD'
}

/*
 * -------------------------------------------
 * datatypes
 * -------------------------------------------
 */

export const dateFromString = pipe(
  string,
  parse((a) => {
    const d = new Date(a)
    return isNaN(d.getTime()) ? pipe(DE.dateFromStringE(a), DE.leafE, Res.fail) : Res.succeed(d)
  }, 'DateFromString')
)

export const None: StructD<{ _tag: LiteralD<['None']> }> = struct({
  _tag: literal('None')
})

export function Some<D extends AnyUD>(value: D): StructD<{ _tag: LiteralD<['Some']>, value: D }> {
  return struct({
    _tag: literal('Some'),
    value
  })
}

export function Option<D extends AnyUD>(
  value: D
): SumD<
  '_tag',
  {
    None: StructD<{ _tag: LiteralD<['None']> }>
    Some: StructD<{ _tag: LiteralD<['Some']>, value: D }>
  }
> {
  return sum('_tag')({
    None,
    Some: Some(value)
  })
}

export function Left<D extends AnyUD>(left: D): StructD<{ _tag: LiteralD<['Left']>, left: D }> {
  return struct({
    _tag: literal('Left'),
    left
  })
}

export function Right<D extends AnyUD>(right: D): StructD<{ _tag: LiteralD<['Right']>, right: D }> {
  return struct({
    _tag: literal('Right'),
    right
  })
}

export function Either<L extends AnyUD, R extends AnyUD>(
  left: L,
  right: R
): SumD<
  '_tag',
  {
    Left: StructD<{ _tag: LiteralD<['Left']>, left: L }>
    Right: StructD<{ _tag: LiteralD<['Right']>, right: R }>
  }
> {
  return sum('_tag')({
    Left: Left(left),
    Right: Right(right)
  })
}

export function SetFromArray<D extends AnyD>(item: D, E: P.Eq<TypeOf<D>>) {
  return pipe(array(item), parse(flow(Set.fromArray(E), Res.succeed)))
}

export function HashSetFromArray<D extends AnyD>(item: D, H: Hash<TypeOf<D>>, E: P.Eq<TypeOf<D>>) {
  return pipe(
    array(item),
    parse((is) =>
      pipe(
        HS.make({ ...H, ...E }),
        HS.mutate((set) => {
          for (let i = 0; i < is.length; i++) {
            HS.add_(set, is[i])
          }
        }),
        Res.succeed
      )
    )
  )
}

/*
 * -------------------------------------------
 * combinators
 * -------------------------------------------
 */

export interface ParseD<From extends Decoder<any, any, any>, E, B>
  extends Decoder<InputOf<From>, ErrorOf<From> | DE.ParseE<E>, B> {
  readonly _tag: 'ParseD'
  readonly from: From
  readonly parser: (i: TypeOf<From>) => Result<E, B>
}

export function parse_<From extends Decoder<any, any, any>, E, B>(
  from: From,
  parser: (i: TypeOf<From>) => Result<E, B>,
  label?: string
): ParseD<From, E, B> {
  return {
    _tag: 'ParseD',
    from,
    label: label ?? from.label,
    parser,
    decode: (i) => pipe(from.decode(i), Res.bind(flow(parser, Res.mapError(DE.parseE))))
  }
}

export function parse<From extends Decoder<any, any, any>, E, B>(
  parser: (i: TypeOf<From>) => Result<E, B>,
  label?: string
): (from: From) => ParseD<From, E, B> {
  return (from) => parse_(from, parser, label)
}

export interface RefineD<From extends AnyD, E, B extends TypeOf<From>>
  extends Decoder<InputOf<From>, ErrorOf<From> | DE.RefineE<E>, B> {
  readonly _tag: 'RefineD'
  readonly from: From
  readonly refinement: Refinement<TypeOf<From>, B>
  readonly onError: (from: TypeOf<From>) => E
}

export function refine_<From extends AnyD, E, B extends TypeOf<From>>(
  from: From,
  refinement: Refinement<TypeOf<From>, B>,
  onError: (from: TypeOf<From>) => E,
  label?: string
): RefineD<From, E, B> {
  return {
    _tag: 'RefineD',
    from,
    refinement,
    onError,
    label: label ?? from.label,
    decode: flow(
      from.decode,
      Res.bind((a) => (refinement(a) ? Res.succeed(a) : Res.fail(DE.refineE(onError(a)))))
    )
  }
}

export function refine<From extends AnyD, E, B extends TypeOf<From>>(
  refinement: Refinement<TypeOf<From>, B>,
  onError: (from: TypeOf<From>) => E,
  label?: string
): (from: From) => RefineD<From, E, B> {
  return (from) => refine_(from, refinement, onError, label)
}

export interface NullableD<Or extends AnyD>
  extends Decoder<InputOf<Or> | undefined | null, DE.NullableE<ErrorOf<Or>>, TypeOf<Or> | null> {
  readonly _tag: 'NullableD'
  readonly or: Or
}

export function nullable<Or extends AnyD>(or: Or): NullableD<Or> {
  return {
    _tag: 'NullableD',
    label: `${or.label} | null | undefined`,
    or,
    decode: (i) => (i == null ? Res.succeed(null) : pipe(or.decode(i), Res.mapError(DE.nullableE)))
  }
}

export interface OptionalD<Or extends AnyD>
  extends Decoder<InputOf<Or> | null | undefined, DE.OptionalE<ErrorOf<Or>>, O.Option<TypeOf<Or>>> {
  readonly _tag: 'OptionalD'
  readonly or: Or
}

export function optional<Or extends AnyD>(or: Or): OptionalD<Or> {
  return {
    _tag: 'OptionalD',
    label: `${or.label} | null | undefined`,
    or,
    decode: (i) => (i == null ? Res.succeed(O.None()) : pipe(or.decode(i), Res.bimap(DE.optionalE, O.Some)))
  }
}

export interface FromStructD<P extends Record<string, AnyD>>
  extends Decoder<
    { [K in keyof P]: InputOf<P[K]> },
    DE.StructE<{ [K in keyof P]: DE.KeyE<K, ErrorOf<P[K]>> }[keyof P]>,
    { [K in keyof P]: TypeOf<P[K]> }
  > {
  readonly _tag: 'FromStructD'
  readonly properties: P
}

export function fromStruct<P extends Record<string, AnyD>>(properties: P): FromStructD<P> {
  const label = `{ ${pipe(
    properties,
    R.ifoldl([] as string[], (b, k, a) => {
      b.push(`${k}: ${a.label}`)
      return b
    }),
    A.join(', ')
  )} }`

  return {
    _tag: 'FromStructD',
    properties,
    label,
    decode: (ur) =>
      S.deferTotal(() => {
        const errors: Array<DE.KeyE<string, any>> = []
        const mut_r: Record<string, any>          = {}
        const ws: Array<RoseTree<DE.Warning>>     = []
        let computation                           = S.unit()
        for(const key in ur) {
          if(!R.has_(properties, key)) {
            ws.push(RT.make(DE.unexpectedKeyW(key), []))
          }
        }
        for (const key in properties) {
          computation = pipe(
            computation,
            S.bind(() =>
              pipe(
                properties[key].decode(ur[key]),
                S.matchM(
                  ([e, w]) =>
                    S.effectTotal(() => {
                      if (A.isNonEmpty(w)) {
                        ws.push(RT.make(DE.keyW(key), w))
                      }
                      errors.push(DE.keyE(key, false, e))
                    }),
                  ([a, w]) =>
                    S.effectTotal(() => {
                      if (A.isNonEmpty(w)) {
                        ws.push(RT.make(DE.keyW(key), w))
                      }
                      mut_r[key] = a
                    })
                )
              )
            )
          )
        }
        return pipe(
          computation,
          S.bind(() =>
            A.isNonEmpty(errors)
              ? Res.fail(DE.structE(errors), ws)
              : Res.succeed(mut_r as { [K in keyof P]: TypeOf<P[K]> }, ws)
          )
        )
      })
  }
}

export interface FromPartialD<P extends Record<string, AnyD>>
  extends Decoder<
    Partial<{ [K in keyof P]: InputOf<P[K]> }>,
    DE.PartialE<{ [K in keyof P]: DE.KeyE<K, ErrorOf<P[K]>> }[keyof P]>,
    Partial<{ [K in keyof P]: TypeOf<P[K]> }>
  > {
  readonly _tag: 'FromPartialD'
  readonly properties: P
}

export function fromPartial<P extends Record<string, AnyD>>(properties: P): FromPartialD<P> {
  const label = `{ ${pipe(
    properties,
    R.ifoldl([] as string[], (b, k, a) => {
      b.push(`${k}?: ${a.label}`)
      return b
    }),
    A.join(', ')
  )} }`
  return {
    _tag: 'FromPartialD',
    properties,
    label,
    decode: (i) =>
      S.deferTotal(() => {
        const errors: Array<DE.KeyE<string, any>> = []
        const mut_r: Record<string, any>          = {}
        const ws: Array<RoseTree<DE.Warning>>     = []
        let computation                           = S.unit()
        for (const key in properties) {
          const ikey  = i[key]
          computation = pipe(
            computation,
            S.bind(() => {
              if (ikey === undefined) {
                return key in i
                  ? S.effectTotal(() => {
                      mut_r[key] = undefined
                    })
                  : S.unit()
              } else {
                return pipe(
                  properties[key].decode(i[key]),
                  S.matchM(
                    ([error, w]) =>
                      S.effectTotal(() => {
                        if (A.isNonEmpty(w)) {
                          ws.push(RT.make(DE.keyW(key), w))
                        }
                        errors.push(DE.keyE(key, true, error))
                      }),
                    ([a, w]) =>
                      S.effectTotal(() => {
                        if (A.isNonEmpty(w)) {
                          ws.push(RT.make(DE.keyW(key), w))
                        }
                        mut_r[key] = a
                      })
                  )
                )
              }
            })
          )
        }
        return pipe(
          computation,
          S.bind(() =>
            A.isNonEmpty(errors)
              ? Res.fail(DE.partialE(errors), ws)
              : Res.succeed(mut_r as { [K in keyof P]: TypeOf<P[K]> }, ws)
          )
        )
      })
  }
}

export interface FromArrayD<Item extends AnyD>
  extends Decoder<Array<InputOf<Item>>, DE.ArrayE<DE.IndexE<number, ErrorOf<Item>>>, Array<TypeOf<Item>>> {
  readonly _tag: 'FromArrayD'
  readonly item: Item
}

export function fromArray<Item extends AnyD>(item: Item): FromArrayD<Item> {
  return {
    _tag: 'FromArrayD',
    label: `Array<${item.label}>`,
    item,
    decode: (i) =>
      S.deferTotal(() => {
        const errors: Array<DE.IndexE<number, any>> = []
        const result: Array<TypeOf<Item>>           = []
        const ws: Array<RoseTree<DE.Warning>>       = []
        return pipe(
          i,
          S.iforeachArrayUnit((index, a) =>
            pipe(
              item.decode(a),
              S.matchM(
                ([error, w]) =>
                  S.effectTotal(() => {
                    if (A.isNonEmpty(w)) {
                      ws.push(RT.make(DE.indexW(index), w))
                    }
                    errors.push(DE.indexE(index, error))
                  }),
                ([a, w]) =>
                  S.effectTotal(() => {
                    if (A.isNonEmpty(w)) {
                      ws.push(RT.make(DE.indexW(index), w))
                    }
                    result.push(a)
                  })
              )
            )
          ),
          S.bind(() => (A.isNonEmpty(errors) ? Res.fail(DE.arrayE(i, errors), ws) : Res.succeed(result, ws)))
        )
      })
  }
}

export interface FromNonEmptyArrayD<Item extends AnyD>
  extends Decoder<
    Array<InputOf<Item>>,
    DE.LeafE<DE.EmptyE> | DE.ArrayE<DE.IndexE<number, ErrorOf<Item>>>,
    NonEmptyArray<TypeOf<Item>>
  > {
  readonly _tag: 'FromNonEmptyArrayD'
  readonly item: Item
}

export function fromNonEmptyArray<Item extends AnyD>(item: Item): FromNonEmptyArrayD<Item> {
  return {
    _tag: 'FromNonEmptyArrayD',
    label: `NonEmptyArray<${item.label}>`,
    item,
    decode: (i) =>
      i.length > 0
        ? ((fromArray(item).decode(i) as unknown) as FSync<
            readonly [DE.ArrayE<DE.IndexE<number, ErrorOf<Item>>>, DE.Warnings],
            readonly [NonEmptyArray<TypeOf<Item>>, DE.Warnings]
          >)
        : Res.fail(DE.leafE(DE.emptyE(i)))
  }
}

export interface FromTupleD<C extends ReadonlyArray<AnyD>>
  extends Decoder<
    { [K in keyof C]: InputOf<C[K]> },
    DE.TupleE<{ [K in keyof C]: DE.ComponentE<CastToNumber<K>, ErrorOf<C[K]>> }[number]>,
    { [K in keyof C]: TypeOf<C[K]> }
  > {
  readonly _tag: 'FromTupleD'
  readonly components: C
}

export function fromTuple<C extends ReadonlyArray<AnyD>>(...components: C): FromTupleD<C> {
  const label = `[ ${pipe(
    components,
    A.map((d) => d.label),
    A.join(', ')
  )} ]`
  return {
    _tag: 'FromTupleD',
    label,
    components,
    decode: (is) =>
      S.deferTotal(() => {
        const errors: Array<DE.ComponentE<number, any>> = []
        const result: Array<any>                        = []
        const ws: Array<RoseTree<DE.Warning>>           = []
        return pipe(
          components,
          S.iforeachArrayUnit((index, decoder) => {
            const i = is[index]
            return pipe(
              decoder.decode(i),
              S.matchM(
                ([error, w]) =>
                  S.effectTotal(() => {
                    if (A.isNonEmpty(w)) {
                      ws.push(RT.make(DE.componentW(index), w))
                    }
                    errors.push(DE.componentE(index, error))
                  }),
                ([a, w]) =>
                  S.effectTotal(() => {
                    if (A.isNonEmpty(w)) {
                      ws.push(RT.make(DE.componentW(index), w))
                    }
                    result.push(a)
                  })
              )
            )
          }),
          S.bind(() =>
            A.isNonEmpty(errors)
              ? Res.fail(DE.tupleE(errors), ws)
              : Res.succeed((result as unknown) as { [K in keyof C]: TypeOf<C[K]> }, ws)
          )
        )
      })
  }
}

export interface FromRecordD<Codomain extends AnyD>
  extends Decoder<
    Record<string, InputOf<Codomain>>,
    DE.RecordE<DE.KeyE<string, ErrorOf<Codomain>>>,
    Record<string, TypeOf<Codomain>>
  > {
  readonly _tag: 'FromRecordD'
  readonly codomain: Codomain
}

export function fromRecord<Codomain extends AnyD>(codomain: Codomain): FromRecordD<Codomain> {
  return {
    _tag: 'FromRecordD',
    label: `Record<string, ${codomain.label}>`,
    codomain,
    decode: (i) =>
      S.deferTotal(() => {
        const errors: Array<DE.KeyE<string, any>> = []
        const mut_r: Record<string, any>          = {}
        const ws: Array<RoseTree<DE.Warning>>     = []
        let computation                           = S.unit()
        for (const key in i) {
          const value = i[key]
          computation = pipe(
            computation,
            S.bind(() =>
              pipe(
                codomain.decode(value),
                S.matchM(
                  ([error, w]) =>
                    S.effectTotal(() => {
                      if (A.isNonEmpty(w)) {
                        ws.push(RT.make(DE.keyW(key), w))
                      }
                      errors.push(DE.keyE(key, true, error))
                    }),
                  ([a, w]) =>
                    S.effectTotal(() => {
                      if (A.isNonEmpty(w)) {
                        ws.push(RT.make(DE.keyW(key), w))
                      }
                      mut_r[key] = a
                    })
                )
              )
            )
          )
        }
        return pipe(
          computation,
          S.bind(() => (A.isNonEmpty(errors) ? Res.fail(DE.recordE(i, errors), ws) : Res.succeed(mut_r, ws)))
        )
      })
  }
}

export interface UnionD<Members extends readonly [AnyD, ...ReadonlyArray<AnyD>]>
  extends Decoder<
    InputOf<Members[keyof Members]>,
    DE.UnionE<{ [K in keyof Members]: DE.MemberE<CastToNumber<K>, ErrorOf<Members[K]>> }[number]>,
    TypeOf<Members[keyof Members]>
  > {
  readonly _tag: 'UnionD'
  readonly members: Members
}

export function union<Members extends readonly [AnyD, ...ReadonlyArray<AnyD>]>(...members: Members): UnionD<Members> {
  const label = pipe(
    members,
    A.map((d) => d.label),
    A.join(' | ')
  )
  return {
    _tag: 'UnionD',
    label,
    members,
    decode: (i) => {
      const errors: Mutable<NonEmptyArray<DE.MemberE<number, any>>> = [] as any
      const ws: Array<RoseTree<DE.Warning>>                         = []
      return pipe(
        members.slice(1),
        A.ifoldl(
          pipe(
            members[0].decode(i),
            S.matchM(
              ([error, w]) =>
                S.effectTotal(() => {
                  if (A.isNonEmpty(w)) {
                    ws.push(RT.make(DE.indexW(0), w))
                  }
                  errors.push(DE.memberE(0, error))
                })['*>'](S.fail(undefined)),
              ([a, w]) =>
                S.effectTotal(() => {
                  if (A.isNonEmpty(w)) {
                    ws.push(RT.make(DE.indexW(0), w))
                  }
                  return a
                })
            )
          ),
          (computation, index, decoder) =>
            S.alt_(computation, () =>
              pipe(
                decoder.decode(i),
                S.matchM(
                  ([error, w]) =>
                    S.effectTotal(() => {
                      if (A.isNonEmpty(w)) {
                        ws.push(RT.make(DE.indexW(index + 1), w))
                      }
                      errors.push(DE.memberE(index + 1, error))
                    })['*>'](S.fail(undefined)),
                  ([a, w]) =>
                    S.effectTotal(() => {
                      if (A.isNonEmpty(w)) {
                        ws.push(RT.make(DE.indexW(index + 1), w))
                      }
                      return a
                    })
                )
              )
            )
        ),
        S.matchM(
          () => Res.fail(DE.unionE(errors), ws),
          (a) => Res.succeed(a, ws)
        )
      )
    }
  }
}

export interface IntersectD<Members extends readonly [AnyD, ...ReadonlyArray<AnyD>]>
  extends Decoder<
    UnionToIntersection<{ [K in keyof Members]: InputOf<Members[K]> }[number]>,
    DE.IntersectionE<{ [K in keyof Members]: DE.MemberE<CastToNumber<K>, ErrorOf<Members[K]>> }[number]>,
    UnionToIntersection<{ [K in keyof Members]: TypeOf<Members[K]> }[number]>
  > {
  readonly _tag: 'IntersectD'
  readonly members: Members
}

export function intersect<Members extends readonly [AnyD, ...ReadonlyArray<AnyD>]>(
  ...members: Members
): IntersectD<Members> {
  const label = pipe(
    members,
    A.map((d) => d.label),
    A.join(' & ')
  )
  return {
    _tag: 'IntersectD',
    label,
    members,
    decode: (i) => {
      const errors: Array<DE.MemberE<number, any>> = [] as any
      const ws: Array<RoseTree<DE.Warning>>        = []
      return pipe(
        members.slice(1),
        A.ifoldl(
          pipe(
            members[0].decode(i),
            S.matchM(
              ([error, w]) =>
                S.effectTotal(() => {
                  if (A.isNonEmpty(w)) {
                    ws.push(RT.make(DE.indexW(0), w))
                  }
                  errors.push(DE.memberE(0, error))
                }),
              ([a, w]) =>
                S.effectTotal(() => {
                  if (A.isNonEmpty(w)) {
                    ws.push(RT.make(DE.indexW(0), w))
                  }
                  return a
                })
            )
          ),
          (computation, index, decoder) =>
            S.bind_(computation, (a) =>
              pipe(
                decoder.decode(i),
                S.matchM(
                  ([error, w]) =>
                    S.effectTotal(() => {
                      if (A.isNonEmpty(w)) {
                        ws.push(RT.make(DE.indexW(index + 1), w))
                      }
                      errors.push(DE.memberE(index + 1, error))
                    }),
                  ([b, w]) => S.effectTotal(() => {
                    if(A.isNonEmpty(w)) {
                      ws.push(RT.make(DE.indexW(index + 1), w))
                    }
                    return _intersect(a, b)
                  })
                )
              )
            )
        ),
        S.bind((result) => (A.isNonEmpty(errors) ? Res.fail(DE.intersectionE(errors), ws) : Res.succeed(result, ws)))
      )
    }
  }
}

export interface LazyD<D extends AnyD> extends Decoder<InputOf<D>, DE.LazyE<ErrorOf<D>>, TypeOf<D>> {
  readonly _tag: 'LazyD'
  readonly id: string
  readonly decoder: Lazy<D>
}

export function lazy<D extends AnyD>(id: string, decoder: () => D): LazyD<D> {
  const get = memoize<void, Decoder<InputOf<D>, ErrorOf<D>, TypeOf<D>>>(decoder)
  return {
    _tag: 'LazyD',
    label: id,
    id,
    decoder,
    decode: (i) =>
      pipe(
        get().decode(i),
        Res.mapError((error) => DE.lazyE(id, error))
      )
  }
}

type EnsureTag<T extends string, Members extends Record<string, AnyD>> = EnforceNonEmptyRecord<Members> &
  {
    [K in keyof Members]: Decoder<any, any, { [tag in T]: K }>
  }

export interface FromSumD<T extends string, Members extends Record<string, AnyD>>
  extends Decoder<
    InputOf<Members[keyof Members]>,
    | DE.TagNotFoundE<T, DE.LiteralE<keyof Members>>
    | DE.SumE<{ [K in keyof Members]: DE.MemberE<K, ErrorOf<Members[K]>> }[keyof Members]>,
    TypeOf<Members[keyof Members]>
  > {
  readonly _tag: 'SumD'
  readonly tag: T
  readonly members: Members
}

export function fromSum<T extends string>(
  tag: T
): <Members extends Record<string, AnyD>>(members: EnsureTag<T, Members>) => FromSumD<T, Members> {
  return (members) => {
    const tags: NonEmptyArray<string> = R.foldl_(members, ([] as unknown) as Mutable<NonEmptyArray<string>>, (b, a) => {
      b.push(...((a as unknown) as FromStructD<any>).properties[tag].literals)
      return b
    })

    const label = pipe(
      members,
      R.foldl([] as string[], (acc, d) => {
        acc.push(d.label)
        return acc
      }),
      A.join(' | ')
    )
    return {
      _tag: 'SumD',
      tag,
      members,
      label,
      decode: (ir) => {
        const v = ir[tag]
        if (v in members) {
          return pipe(
            members[v].decode(ir),
            Res.mapError((error) => DE.sumE([DE.memberE(v, error)]))
          )
        }
        return Res.fail(DE.tagNotFoundE(tag, DE.literalE(v, tags)))
      }
    }
  }
}

export interface StructD<P extends Record<string, AnyUD>>
  extends UDecoder<
    DE.UnknownRecordLE | DE.StructE<{ [K in keyof P]: DE.KeyE<K, ErrorOf<P[K]>> }[keyof P]>,
    { [K in keyof P]: TypeOf<P[K]> }
  > {
  readonly _tag: 'StructD'
  readonly properties: P
}

export function struct<P extends Record<string, AnyUD>>(properties: P): StructD<P> {
  const { decode, label } = compose_(UnknownRecord, fromStruct(properties) as any)
  return {
    _tag: 'StructD',
    label,
    decode: decode as any,
    properties
  }
}

export interface PartialD<P extends Record<string, AnyUD>>
  extends UDecoder<
    DE.UnknownRecordLE | DE.PartialE<{ [K in keyof P]: DE.KeyE<K, ErrorOf<P[K]>> }[keyof P]>,
    Partial<{ [K in keyof P]: TypeOf<P[K]> }>
  > {
  readonly _tag: 'PartialD'
  readonly properties: P
}

export function partial<P extends Record<string, AnyUD>>(properties: P): PartialD<P> {
  const { decode, label } = compose_(UnknownRecord, fromPartial(properties) as any)
  return {
    _tag: 'PartialD',
    label,
    decode: decode as any,
    properties
  }
}

export interface ArrayD<Item extends AnyUD>
  extends UDecoder<DE.UnknownArrayLE | DE.ArrayE<DE.IndexE<number, ErrorOf<Item>>>, Array<TypeOf<Item>>> {
  readonly _tag: 'ArrayD'
  readonly item: Item
}

export function array<Item extends AnyUD>(item: Item): ArrayD<Item> {
  const { decode, label } = compose_(UnknownArray, fromArray(item) as any)
  return {
    _tag: 'ArrayD',
    label,
    decode: decode as any,
    item
  }
}

export interface NonEmptyArrayD<Item extends AnyUD>
  extends UDecoder<
    DE.ArrayE<DE.IndexE<number, ErrorOf<Item>>> | DE.EmptyLE | DE.UnknownArrayLE,
    NonEmptyArray<TypeOf<Item>>
  > {
  readonly _tag: 'NonEmptyArrayD'
  readonly item: Item
}

export function nonEmptyArray<Item extends AnyUD>(item: Item): NonEmptyArrayD<Item> {
  const { decode, label } = compose_(UnknownNonEmptyArray, fromNonEmptyArray(item) as any)
  return {
    _tag: 'NonEmptyArrayD',
    label,
    decode: decode as any,
    item
  }
}

export interface TupleD<C extends ReadonlyArray<AnyUD>>
  extends UDecoder<
    DE.UnknownArrayLE | DE.TupleE<{ [K in keyof C]: DE.ComponentE<CastToNumber<K>, ErrorOf<C[K]>> }[number]>,
    { [K in keyof C]: TypeOf<C[K]> }
  > {
  readonly _tag: 'TupleD'
  readonly components: C
}

export function tuple<C extends ReadonlyArray<AnyUD>>(...components: C): TupleD<C> {
  const { decode, label } = compose_(UnknownArray, fromTuple(...components) as any)
  return {
    _tag: 'TupleD',
    label,
    components,
    decode: decode as any
  }
}

export interface RecordD<Codomain extends AnyUD>
  extends UDecoder<
    DE.UnknownRecordLE | DE.RecordE<DE.KeyE<string, ErrorOf<Codomain>>>,
    Record<string, TypeOf<Codomain>>
  > {
  readonly _tag: 'RecordD'
  readonly codomain: Codomain
}

export function record<Codomain extends AnyUD>(codomain: Codomain): RecordD<Codomain> {
  const { label, decode } = compose_(UnknownRecord, fromRecord(codomain) as any)
  return {
    _tag: 'RecordD',
    label,
    codomain,
    decode: decode as any
  }
}

export interface SumD<T extends string, Members extends Record<string, AnyUD>>
  extends UDecoder<
    | DE.UnknownRecordLE
    | DE.TagNotFoundE<T, DE.LiteralE<keyof Members>>
    | DE.SumE<{ [K in keyof Members]: DE.MemberE<K, ErrorOf<Members[K]>> }[keyof Members]>,
    TypeOf<Members[keyof Members]>
  > {
  readonly _tag: 'SumD'
  readonly tag: T
  readonly members: Members
}

export function sum<T extends string>(
  tag: T
): <Members extends Record<string, AnyUD>>(members: EnsureTag<T, Members>) => SumD<T, Members> {
  return (members) => {
    const { label, decode } = compose_(UnknownRecord, fromSum(tag)(members) as any)
    return {
      _tag: 'SumD',
      tag,
      members,
      label,
      decode: decode as any
    }
  }
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export interface MapD<D extends AnyD, B> extends Decoder<InputOf<D>, ErrorOf<D>, B> {
  readonly _tag: 'MapD'
  readonly decoder: D
  readonly f: (a: TypeOf<D>) => B
}

export function map_<D extends AnyD, B>(decoder: D, f: (a: TypeOf<D>) => B): MapD<D, B> {
  return {
    _tag: 'MapD',
    decoder,
    f,
    label: decoder.label,
    decode: flow(decoder.decode, Res.map(f))
  }
}

export function map<D extends AnyD, B>(f: (a: TypeOf<D>) => B): (decoder: D) => MapD<D, B> {
  return (decoder) => map_(decoder, f)
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export interface MapErrorD<D extends AnyD, G> extends Decoder<InputOf<D>, G, TypeOf<D>> {
  readonly _tag: 'MapErrorD'
  readonly decoder: D
  readonly f: (e: ErrorOf<D>) => G
}

export function mapError_<D extends AnyD, G>(decoder: D, f: (e: ErrorOf<D>) => G): MapErrorD<D, G> {
  return {
    _tag: 'MapErrorD',
    decoder,
    f,
    label: decoder.label,
    decode: flow(decoder.decode, Res.mapError(f))
  }
}

export function mapError<D extends AnyD, G>(f: (e: ErrorOf<D>) => G): (decoder: D) => MapErrorD<D, G> {
  return (decoder) => mapError_(decoder, f)
}

/*
 * -------------------------------------------
 * composition
 * -------------------------------------------
 */

export interface ComposeD<From extends Decoder<any, any, any>, To extends Decoder<TypeOf<From>, any, any>>
  extends Decoder<InputOf<From>, ErrorOf<From> | ErrorOf<To>, TypeOf<To>> {
  readonly _tag: 'ComposeD'
  readonly from: From
  readonly to: To
}

export function compose_<From extends Decoder<any, any, any>, To extends Decoder<TypeOf<From>, any, any>>(
  from: From,
  to: To
): ComposeD<From, To>
export function compose_<I, E, A, E1, B>(ia: Decoder<I, E, A>, ab: Decoder<A, E1, B>): Decoder<I, E | E1, B>
export function compose_<From extends Decoder<any, any, any>, To extends Decoder<TypeOf<From>, any, any>>(
  from: From,
  to: To
): ComposeD<From, To> {
  return {
    _tag: 'ComposeD',
    label: `${from.label} >>> ${to.label}`,
    from,
    to,
    decode: flow(from.decode, Res.bind(to.decode))
  }
}

export function compose<From extends Decoder<any, any, any>, To extends Decoder<TypeOf<From>, any, any>>(
  ab: To
): (ia: From) => ComposeD<From, To>
export function compose<A, E1, B>(ab: Decoder<A, E1, B>): <I, E>(ia: Decoder<I, E, A>) => Decoder<I, E | E1, B>
export function compose<From extends Decoder<any, any, any>, To extends Decoder<TypeOf<From>, any, any>>(
  ab: To
): (ia: From) => ComposeD<From, To> {
  return (ia) => compose_(ia, ab)
}

export interface IdD<A> extends Decoder<A, never, A> {
  readonly _tag: 'IdD'
}

export function id<A>(): IdD<A>
export function id<A>(): Decoder<A, never, A>
export function id<A>(): IdD<A> {
  return {
    _tag: 'IdD',
    label: 'id',
    decode: Res.succeed
  }
}

/*
 * -------------------------------------------
 * utils
 * -------------------------------------------
 */

export type ConcreteDecoder =
  | stringUD
  | numberUD
  | booleanUD
  | UnknownArrayUD
  | UnknownRecordUD
  | FromRefinementD<any, any, any>
  | FromParseD<any, any, any>
  | FromStructD<any>
  | StructD<any>
  | FromPartialD<any>
  | PartialD<any>
  | FromArrayD<any>
  | ArrayD<any>
  | FromTupleD<any>
  | TupleD<any>
  | UnionD<any>
  | IntersectD<any>
  | LazyD<any>
  | ParseD<any, any, any>
  | NullableD<any>
  | OptionalD<any>
  | ComposeD<any, any>

/**
 * @optimize identity
 */
function asConcrete(d: AnyD): ConcreteDecoder {
  return d as any
}

export interface LabeledD<D extends AnyD> extends Decoder<InputOf<D>, DE.LabeledE<ErrorOf<D>>, TypeOf<D>> {
  readonly _tag: 'LabeledD'
  readonly decoder: D
}

export function withLabel<D extends AnyD>(decoder: D): LabeledD<D> {
  return {
    _tag: 'LabeledD',
    decoder,
    label: decoder.label,
    decode: flow(
      decoder.decode,
      Res.mapError((error) => DE.labeledE(decoder.label, error))
    )
  }
}

export interface MessageD<D extends AnyD> extends Decoder<InputOf<D>, DE.MessageE<ErrorOf<D>>, TypeOf<D>> {
  readonly _tag: 'MessageD'
  readonly decoder: D
  readonly message: string
}

export function withMessage_<D extends AnyD>(decoder: D, message: string): MessageD<D> {
  return {
    _tag: 'MessageD',
    message,
    decoder,
    label: decoder.label,
    decode: flow(
      decoder.decode,
      Res.mapError((error) => DE.messageE(message, error))
    )
  }
}

export function withMessage(message: string): <D extends AnyD>(decoder: D) => MessageD<D> {
  return (decoder) => withMessage_(decoder, message)
}

export type Pick<D, Prop extends PropertyKey> = D extends FromStructD<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends StructD<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends FromPartialD<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends PartialD<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends IntersectD<infer Ds>
  ? { [K in keyof Ds]: Pick<Ds[K], Prop> }[number]
  : D extends UnionD<infer Ds>
  ? { [K in keyof Ds]: Pick<Ds[K], Prop> }[number]
  : D extends Decoder<infer I, infer E, infer A>
  ? Prop extends keyof A
    ? Prop extends keyof I
      ? Decoder<I[Prop], E, A[Prop]>
      : unknown extends I
      ? UDecoder<E, A[Prop]>
      : never
    : never
  : never

export function pick_<D extends AnyD, Prop extends keyof TypeOf<D>>(
  decoder: D,
  prop: Prop
): FSync<void, Pick<D, Prop>> {
  return S.deferTotal(() => {
    const d = asConcrete(decoder)
    switch (d._tag) {
      case 'StructD':
      case 'FromStructD':
      case 'PartialD':
      case 'FromPartialD': {
        return prop in d.properties ? S.succeed(d.properties[prop]) : S.fail(undefined)
      }
      case 'UnionD':
      case 'IntersectD': {
        return pipe(
          d.members,
          S.foreach((d: AnyD) =>
            S.matchM_(
              pick_(d, prop),
              (_) => S.unit(),
              (a: AnyD) => S.succeed(a)
            )
          ),
          S.map(A.filter((a): a is AnyD => a !== undefined)),
          S.bind((as) => (as.length === 0 ? S.fail(undefined) : S.succeed(as[0])))
        )
      }
      case 'LazyD': {
        return pick_(d.decoder() as AnyD, prop)
      }
      case 'ComposeD': {
        return pick_(d.to as AnyD, prop)
      }
      default: {
        return S.fail(undefined)
      }
    }
  })
}

export function pick<D extends AnyD, Prop extends keyof TypeOf<D>>(
  prop: Prop
): (decoder: D) => FSync<void, Pick<D, Prop>> {
  return (decoder) => pick_(decoder, prop)
}

/*
 * -------------------------------------------
 * instances
 * -------------------------------------------
 */

export const Category = HKT.instance<P.Category<[HKT.URI<DecoderURI>], V>>({
  compose_,
  compose,
  id
})

export { DecoderURI }

/*
 * -------------------------------------------
 * run
 * -------------------------------------------
*/

export function run_<I, E, A>(d: Decoder<I, E, A>, i: I): readonly [Either<E, A>, DE.Warnings] {
  return pipe(
    d.decode(i),
    S.match(
      ([e, w]) => [E.Left(e), w] as const,
      ([a, w]) => [E.Right(a), w] as const
    ),
    S.run
  )
}

export function run<I>(i: I): <E, A>(d: Decoder<I, E, A>) => readonly [Either<E, A>, DE.Warnings] {
  return (d) => run_(d, i)
}

/*
 * -------------------------------------------
 * testing
 * -------------------------------------------
*/

const d = struct({
  a: string,
  b: number,
  c: struct({
    d: boolean
  })
})
