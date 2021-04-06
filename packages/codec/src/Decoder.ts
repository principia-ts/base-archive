import type { DecodeError } from './DecodeError'
import type { DecoderURI } from './Modules'
import type { Lazy } from '@principia/base/function'
import type { Guard } from '@principia/base/Guard'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Option } from '@principia/base/Option'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { Refinement } from '@principia/base/Refinement'
import type * as P from '@principia/base/typeclass'
import type { Primitive, UnionToIntersection, UnionToTuple } from '@principia/base/util/types'
import type { FSync } from '@principia/io/Sync'

import * as A from '@principia/base/Array'
import * as B from '@principia/base/boolean'
import { flow, memoize, pipe } from '@principia/base/function'
import * as G from '@principia/base/Guard'
import * as HKT from '@principia/base/HKT'
import * as N from '@principia/base/number'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import * as Str from '@principia/base/string'
import * as Struct from '@principia/base/Struct'
import * as S from '@principia/io/Sync'

import {
  ArrayE,
  BigIntE,
  BooleanE,
  DateFromStringE,
  IndexE,
  IntersectE,
  KeyE,
  KeyOfE,
  LabeledE,
  LazyE,
  LiteralE,
  MessageE,
  NonExistentZeroIndexE,
  NullableE,
  NumberE,
  OptionalE,
  ParseE,
  RecordE,
  StringE,
  StructE,
  TagE,
  TupleE,
  UnionE,
  UnknownArrayE,
  UnknownRecordE
} from './DecodeError'
import { _intersect } from './util'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Decoder<I, E, A> {
  readonly _I?: (_: I) => void
  readonly _E?: () => E
  readonly _A?: () => A

  readonly label: string
  readonly decode: (i: I) => FSync<DecodeError<E>, A>
}

export type V = HKT.V<'I', '_'>

export interface UDecoder<E, A> extends Decoder<unknown, E, A> {}

export type InputOf<D> = D extends Decoder<infer I, any, any> ? I : never
export type ErrorOf<D> = D extends Decoder<any, infer E, any> ? E : never
export type TypeOf<D> = D extends Decoder<any, any, infer A> ? A : never

export type AnyD = Decoder<any, any, any>
export type AnyUD = UDecoder<any, any>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export interface FromParseD<I, E, A> extends Decoder<I, E, A> {
  readonly _tag: 'FromParseD'
  readonly parser: (i: I) => FSync<E, A>
}

/**
 * Constructs a Decoder from a parsing function
 */
export function fromParse<I, E, A>(parser: (i: I) => FSync<E, A>, label: string): FromParseD<I, E, A> {
  return {
    _tag: 'FromParseD',
    label,
    parser,
    decode: (i) =>
      pipe(
        parser(i),
        S.mapError((e) => new ParseE(i, e))
      )
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
    decode: (i) => (refinement(i) ? S.succeed(i) : S.fail(onError(i)))
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

export interface LiteralUD<A extends readonly [Primitive, ...ReadonlyArray<Primitive>]>
  extends UDecoder<LiteralE<A>, A[number]> {
  readonly _tag: 'LiteralUD'
  readonly literals: A
}

/**
 * Constructs a Decoder from one or more literals
 */
export function literal<A extends readonly [Primitive, ...ReadonlyArray<Primitive>]>(...literals: A): LiteralUD<A> {
  return {
    _tag: 'LiteralUD',
    label: pipe(
      literals,
      A.map((l) => String(l)),
      A.join(' | ')
    ),
    literals,
    decode: (i) => (G.literal(...literals).is(i) ? S.succeed(i) : S.fail(new LiteralE(i, literals)))
  }
}

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

export interface stringUD extends Decoder<unknown, StringE, string> {
  readonly _tag: 'stringUD'
}

export const string: stringUD = {
  ...fromGuard(Str.Guard, (i) => new StringE(i), 'string'),
  _tag: 'stringUD'
}

export interface numberUD extends Decoder<unknown, NumberE, number> {
  readonly _tag: 'numberUD'
}

export const number: numberUD = {
  ...fromGuard(N.Guard, (i) => new NumberE(i), 'number'),
  _tag: 'numberUD'
}

export interface booleanUD extends Decoder<unknown, BooleanE, boolean> {
  readonly _tag: 'booleanUD'
}

export const boolean: booleanUD = {
  ...fromGuard(B.Guard, (i) => new BooleanE(i), 'boolean'),
  _tag: 'booleanUD'
}

export interface UnknownArrayUD extends Decoder<unknown, UnknownArrayE, ReadonlyArray<unknown>> {
  readonly _tag: 'UnknownArrayUD'
}

export const UnknownArray: UnknownArrayUD = {
  ...fromGuard(A.GuardUnknownArray, (i) => new UnknownArrayE(i), 'Array<unknown>'),
  _tag: 'UnknownArrayUD'
}

export interface UnknownNonEmptyArrayUD
  extends Decoder<unknown, UnknownArrayE | NonExistentZeroIndexE, NonEmptyArray<unknown>> {
  readonly _tag: 'NonEmptyArrayUD'
}

export const UnknownNonEmptyArray: UnknownNonEmptyArrayUD = {
  ...pipe(
    UnknownArray,
    refine(
      (as: ReadonlyArray<unknown>): as is NonEmptyArray<unknown> => as.length > 0,
      (i) => new NonExistentZeroIndexE(i),
      'NonEmptyArray<unknown>'
    ),
    Struct.pick('label', 'decode')
  ),
  _tag: 'NonEmptyArrayUD'
}

export interface UnknownRecordUD extends Decoder<unknown, UnknownRecordE, ReadonlyRecord<string, unknown>> {
  readonly _tag: 'UnknownRecordUD'
}

export const UnknownRecord: UnknownRecordUD = {
  ...fromGuard(R.GuardUnknownRecord, (i) => new UnknownRecordE(i), 'Record<string, unknown>'),
  _tag: 'UnknownRecordUD'
}

export const bigint = pipe(
  string,
  parse(
    (i) =>
      S.effectCatch_(
        () => BigInt(i),
        (_) => new BigIntE(i)
      ),
    'bigint'
  )
)

export const dateFromString = pipe(
  string,
  parse((a) => {
    const d = new Date(a)
    return isNaN(d.getTime()) ? S.fail(new DateFromStringE(a)) : S.succeed(d)
  }, 'DateFromString')
)

/*
 * -------------------------------------------
 * Datatypes
 * -------------------------------------------
 */

export const None: StructUD<{ _tag: LiteralUD<['None']> }> = struct({
  _tag: literal('None')
})

export function Some<D extends AnyUD>(value: D): StructUD<{ _tag: LiteralUD<['Some']>, value: D }> {
  return struct({
    _tag: literal('Some'),
    value
  })
}

export function Option<D extends AnyUD>(
  value: D
): SumUD<
  '_tag',
  {
    None: StructUD<{ _tag: LiteralUD<['None']> }>
    Some: StructUD<{ _tag: LiteralUD<['Some']>, value: D }>
  }
> {
  return sum('_tag')({
    None,
    Some: Some(value)
  })
}

export function Left<D extends AnyUD>(left: D): StructUD<{ _tag: LiteralUD<['Left']>, left: D }> {
  return struct({
    _tag: literal('Left'),
    left
  })
}

export function Right<D extends AnyUD>(right: D): StructUD<{ _tag: LiteralUD<['Right']>, right: D }> {
  return struct({
    _tag: literal('Right'),
    right
  })
}

export function Either<L extends AnyUD, R extends AnyUD>(
  left: L,
  right: R
): SumUD<
  '_tag',
  {
    Left: StructUD<{ _tag: LiteralUD<['Left']>, left: L }>
    Right: StructUD<{ _tag: LiteralUD<['Right']>, right: R }>
  }
> {
  return sum('_tag')({
    Left: Left(left),
    Right: Right(right)
  })
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export interface ParseD<From extends Decoder<any, any, any>, E, B>
  extends Decoder<InputOf<From>, ErrorOf<From> | E, B> {
  readonly _tag: 'ParseD'
  readonly from: From
  readonly parser: (i: TypeOf<From>) => FSync<E, B>
}

export function parse_<From extends Decoder<any, any, any>, E, B>(
  from: From,
  parser: (i: TypeOf<From>) => FSync<E, B>,
  label?: string
): ParseD<From, E, B> {
  return {
    _tag: 'ParseD',
    from,
    label: label ?? from.label,
    parser,
    decode: (i) =>
      pipe(
        from.decode(i),
        S.bind(
          flow(
            parser,
            S.mapError((e) => new ParseE(i, e))
          )
        )
      )
  }
}

export function parse<From extends Decoder<any, any, any>, E, B>(
  parser: (i: TypeOf<From>) => FSync<E, B>,
  label?: string
): (from: From) => ParseD<From, E, B> {
  return (from) => parse_(from, parser, label)
}

export interface RefineD<From extends AnyD, E, B extends TypeOf<From>>
  extends Decoder<InputOf<From>, ErrorOf<From> | E, B> {
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
      S.bind((a) => (refinement(a) ? S.succeed(a) : S.fail(onError(a))))
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
  extends Decoder<InputOf<Or> | undefined | null, ErrorOf<Or>, TypeOf<Or> | null> {
  readonly _tag: 'NullableD'
  readonly or: Or
}

export function nullable<Or extends AnyD>(or: Or): NullableD<Or> {
  return {
    _tag: 'NullableD',
    label: `${or.label} | null | undefined`,
    or,
    decode: (i) =>
      i == null
        ? S.succeed(null)
        : pipe(
            or.decode(i),
            S.mapError((e) => new NullableE(i, e))
          )
  }
}

export interface OptionalD<Or extends AnyD>
  extends Decoder<InputOf<Or> | null | undefined, ErrorOf<Or>, Option<TypeOf<Or>>> {
  readonly _tag: 'OptionalD'
  readonly or: Or
}

export function optional<Or extends AnyD>(or: Or): OptionalD<Or> {
  return {
    _tag: 'OptionalD',
    label: `${or.label} | null | undefined`,
    or,
    decode: (i) =>
      i == null
        ? S.succeed(O.None())
        : pipe(
            or.decode(i),
            S.bimap((e) => new OptionalE(i, e), O.Some)
          )
  }
}

export interface StructD<P extends Record<string, AnyD>>
  extends Decoder<{ [K in keyof P]: InputOf<P[K]> }, ErrorOf<P[keyof P]>, { [K in keyof P]: TypeOf<P[K]> }> {
  readonly _tag: 'StructD'
  readonly properties: P
}

export function fromStruct<P extends Record<string, AnyD>>(properties: P): StructD<P> {
  const label = `{ ${pipe(
    properties,
    R.ifoldl([] as string[], (b, k, a) => {
      b.push(`${k}: ${a.label}`)
      return b
    }),
    A.join(', ')
  )} }`

  return {
    _tag: 'StructD',
    properties,
    label,
    decode: (i) =>
      S.deferTotal(() => {
        const errors: Array<KeyE<any>>   = []
        const mut_r: Record<string, any> = {}
        let computation                  = S.unit()
        for (const key in properties) {
          computation = pipe(
            computation,
            S.bind(() =>
              pipe(
                properties[key].decode(i[key]),
                S.matchM(
                  (e) =>
                    S.effectTotal(() => {
                      errors.push(new KeyE(i[key], key, e))
                    }),
                  (a) =>
                    S.effectTotal(() => {
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
            A.isNonEmpty(errors) ? S.fail(new StructE(i, errors)) : S.succeed(mut_r as { [K in keyof P]: TypeOf<P[K]> })
          )
        )
      })
  }
}

export interface PartialD<P extends Record<string, AnyD>>
  extends Decoder<
    Partial<{ [K in keyof P]: InputOf<P[K]> }>,
    ErrorOf<P[keyof P]>,
    Partial<{ [K in keyof P]: TypeOf<P[K]> }>
  > {
  readonly _tag: 'PartialD'
  readonly properties: P
}

export function fromPartial<P extends Record<string, AnyD>>(properties: P): PartialD<P> {
  const label = `{ ${pipe(
    properties,
    R.ifoldl([] as string[], (b, k, a) => {
      b.push(`${k}?: ${a.label}`)
      return b
    }),
    A.join(', ')
  )} }`
  return {
    _tag: 'PartialD',
    properties,
    label,
    decode: (i) =>
      S.deferTotal(() => {
        const errors: Array<KeyE<any>>   = []
        const mut_r: Record<string, any> = {}
        let computation                  = S.unit()
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
                    (e) =>
                      S.effectTotal(() => {
                        errors.push(new KeyE(i[key], key, e))
                      }),
                    (a) =>
                      S.effectTotal(() => {
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
            A.isNonEmpty(errors) ? S.fail(new StructE(i, errors)) : S.succeed(mut_r as { [K in keyof P]: TypeOf<P[K]> })
          )
        )
      })
  }
}

export interface ArrayD<Item extends AnyD> extends Decoder<Array<InputOf<Item>>, ErrorOf<Item>, Array<TypeOf<Item>>> {
  readonly _tag: 'ArrayD'
  readonly item: Item
}

export function fromArray<Item extends AnyD>(item: Item): ArrayD<Item> {
  return {
    _tag: 'ArrayD',
    label: `Array<${item.label}>`,
    item,
    decode: (i) =>
      S.deferTotal(() => {
        const errors: Array<IndexE<any>>  = []
        const result: Array<TypeOf<Item>> = []
        return pipe(
          i,
          S.iforeachArrayUnit((i, a) =>
            pipe(
              item.decode(a),
              S.matchM(
                (e) =>
                  S.effectTotal(() => {
                    errors.push(new IndexE(a, i, e))
                  }),
                (a) =>
                  S.effectTotal(() => {
                    result.push(a)
                  })
              )
            )
          ),
          S.bind(() => (A.isNonEmpty(errors) ? S.fail(new ArrayE(i, errors)) : S.succeed(result)))
        )
      })
  }
}

export interface NonEmptyArrayD<Item extends AnyD>
  extends Decoder<Array<InputOf<Item>>, NonExistentZeroIndexE | ErrorOf<Item>, NonEmptyArray<TypeOf<Item>>> {
  readonly _tag: 'NonEmptyArrayD'
  readonly item: Item
}

export function fromNonEmptyArray<Item extends AnyD>(item: Item): NonEmptyArrayD<Item> {
  return {
    _tag: 'NonEmptyArrayD',
    label: `NonEmptyArray<${item.label}>`,
    item,
    decode: (i) =>
      i.length > 0
        ? ((fromArray(item).decode(i) as unknown) as FSync<ErrorOf<Item>, NonEmptyArray<TypeOf<Item>>>)
        : S.fail(new NonExistentZeroIndexE(i))
  }
}

export interface TupleD<C extends ReadonlyArray<AnyD>>
  extends Decoder<{ [K in keyof C]: InputOf<C[K]> }, ErrorOf<C[number]>, { [K in keyof C]: TypeOf<C[K]> }> {
  readonly _tag: 'TupleD'
  readonly components: C
}

export function fromTuple<C extends ReadonlyArray<AnyD>>(...components: C): TupleD<C> {
  const label = `[ ${pipe(
    components,
    A.map((d) => d.label),
    A.join(', ')
  )} ]`
  return {
    _tag: 'TupleD',
    label,
    components,
    decode: (is) =>
      S.deferTotal(() => {
        const errors: Array<IndexE<any>> = []
        const result: Array<any>         = []
        return pipe(
          components,
          S.iforeachArrayUnit((index, decoder) => {
            const i = is[index]
            return pipe(
              decoder.decode(i),
              S.matchM(
                (e) =>
                  S.effectTotal(() => {
                    errors.push(new IndexE(i, index, e))
                  }),
                (a) =>
                  S.effectTotal(() => {
                    result.push(a)
                  })
              )
            )
          }),
          S.bind(() =>
            A.isNonEmpty(errors)
              ? S.fail(new TupleE(is, errors))
              : S.succeed((result as unknown) as { [K in keyof C]: TypeOf<C[K]> })
          )
        )
      })
  }
}

export interface RecordD<Codomain extends AnyD>
  extends Decoder<Record<string, InputOf<Codomain>>, ErrorOf<Codomain>, Record<string, TypeOf<Codomain>>> {
  readonly _tag: 'RecordD'
  readonly codomain: Codomain
}

export function fromRecord<Codomain extends AnyD>(codomain: Codomain): RecordD<Codomain> {
  return {
    _tag: 'RecordD',
    label: `Record<string, ${codomain.label}>`,
    codomain,
    decode: (i) =>
      S.deferTotal(() => {
        const errors: Array<KeyE<ErrorOf<Codomain>>> = []
        const mut_r: Record<string, any>             = {}
        let computation                              = S.unit()
        for (const key in i) {
          const value = i[key]
          computation = pipe(
            computation,
            S.bind(() => {
              return pipe(
                codomain.decode(value),
                S.matchM(
                  (e) =>
                    S.effectTotal(() => {
                      errors.push(new KeyE(value, key, e))
                    }),
                  (a) =>
                    S.effectTotal(() => {
                      mut_r[key] = a
                    })
                )
              )
            })
          )
        }
        return pipe(
          computation,
          S.bind(() => (A.isNonEmpty(errors) ? S.fail(new RecordE(i, errors)) : S.succeed(mut_r)))
        )
      })
  }
}

export interface UnionD<Members extends readonly [AnyD, ...ReadonlyArray<AnyD>]>
  extends Decoder<InputOf<Members[keyof Members]>, ErrorOf<Members[keyof Members]>, TypeOf<Members[keyof Members]>> {
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
      const errors: Array<IndexE<any>> = []
      return pipe(
        members.slice(1),
        A.ifoldl(
          pipe(
            members[0].decode(i),
            S.matchM(
              (e) =>
                S.effectTotal(() => {
                  errors.push(new IndexE(i, 0, e))
                })['*>'](S.fail(undefined)),
              S.succeed
            )
          ),
          (computation, index, decoder) =>
            S.alt_(computation, () =>
              pipe(
                decoder.decode(i),
                S.matchM(
                  (e) =>
                    S.effectTotal(() => {
                      errors.push(new IndexE(i, index + 1, e))
                    })['*>'](S.fail(undefined)),
                  S.succeed
                )
              )
            )
        ),
        S.mapError(() => new UnionE(i, errors as any))
      )
    }
  }
}

export interface IntersectD<Members extends readonly [AnyD, ...ReadonlyArray<AnyD>]>
  extends Decoder<
    UnionToIntersection<{ [K in keyof Members]: InputOf<Members[K]> }[number]>,
    ErrorOf<Members[number]>,
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
      const errors: Array<IndexE<any>> = []
      let value: any
      return pipe(
        members.slice(1),
        A.ifoldl(
          pipe(
            members[0].decode(i),
            S.matchM(
              (e) =>
                S.effectTotal(() => {
                  errors.push(new IndexE(i, 0, e))
                }),
              (a) =>
                S.effectTotal(() => {
                  value = a
                })
            )
          ),
          (computation, index, decoder) =>
            S.bind_(computation, () =>
              S.matchM_(
                decoder.decode(i),
                (e) =>
                  S.effectTotal(() => {
                    errors.push(new IndexE(i, index + 1, e))
                  }),
                (a) =>
                  S.effectTotal(() => {
                    value = _intersect(value, a)
                  })
              )
            )
        ),
        S.bind(() => (A.isNonEmpty(errors) ? S.fail(new IntersectE(i, errors)) : S.succeed(value)))
      )
    }
  }
}

export interface LazyD<D extends AnyD> extends Decoder<InputOf<D>, ErrorOf<D>, TypeOf<D>> {
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
        S.mapError((e) => new LazyE(id, e))
      )
  }
}

type EnsureTag<T extends string, Members extends Record<string, AnyD>> = Members &
  {
    [K in keyof Members]: Decoder<any, any, { [tag in T]: K }>
  }

export interface SumD<T extends string, Members extends Record<string, AnyD>>
  extends Decoder<
    InputOf<Members[keyof Members]>,
    TagE<keyof Members> | ErrorOf<Members[keyof Members]>,
    TypeOf<Members[keyof Members]>
  > {
  readonly _tag: 'SumD'
  readonly tag: T
  readonly members: Members
}

export function fromSum<T extends string>(
  tag: T
): <Members extends Record<string, AnyD>>(members: EnsureTag<T, Members>) => SumD<T, Members> {
  return (members) => {
    const literals = R.foldl_(members, [] as string[], (b, a) => {
      b.push(...((a as unknown) as StructD<any>).properties[tag].literals)
      return b
    })
    const label    = pipe(
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
          return members[v].decode(ir)
        }
        return S.fail(new TagE(ir, literals as any))
      }
    }
  }
}

/*
 * -------------------------------------------
 * UDecoder Combinators
 * -------------------------------------------
 */

export interface KeyOfUD<Keys extends Record<string, any>>
  extends UDecoder<StringE | KeyOfE<keyof Keys & string>, keyof Keys & string> {
  readonly _tag: 'KeyOfUD'
  readonly keys: Keys
}

export function keyof<Keys extends Record<string, any>>(keys: Keys): KeyOfUD<Keys> {
  return {
    _tag: 'KeyOfUD',
    keys,
    label: pipe(R.keys(keys), A.join(' | ')),
    decode: pipe(
      string,
      refine(
        (s): s is keyof Keys & string => R.keys(keys).indexOf(s) !== -1,
        (s) => new KeyOfE(s, (R.keys(keys) as unknown) as NonEmptyArray<string>)
      )
    ).decode
  }
}

export interface StructUD<P extends Record<string, AnyUD>>
  extends UDecoder<UnknownRecordE | ErrorOf<P[keyof P]>, { [K in keyof P]: TypeOf<P[K]> }> {
  readonly _tag: 'StructUD'
  readonly properties: P
}

export function struct<P extends Record<string, AnyUD>>(properties: P): StructUD<P> {
  const { decode, label } = compose_(UnknownRecord, fromStruct(properties) as any)
  return {
    _tag: 'StructUD',
    label,
    decode: decode as any,
    properties
  }
}

export interface PartialUD<P extends Record<string, AnyUD>>
  extends UDecoder<UnknownRecordE | ErrorOf<P[keyof P]>, Partial<{ [K in keyof P]: TypeOf<P[K]> }>> {
  readonly _tag: 'PartialUD'
  readonly properties: P
}

export function partial<P extends Record<string, AnyUD>>(properties: P): PartialUD<P> {
  const { decode, label } = compose_(UnknownRecord, fromPartial(properties) as any)
  return {
    _tag: 'PartialUD',
    label,
    decode: decode as any,
    properties
  }
}

export interface ArrayUD<Item extends AnyUD> extends UDecoder<ErrorOf<Item> | UnknownArrayE, Array<TypeOf<Item>>> {
  readonly _tag: 'ArrayUD'
  readonly item: Item
}

export function array<Item extends AnyUD>(item: Item): ArrayUD<Item> {
  const { decode, label } = compose_(UnknownArray, fromArray(item) as any)
  return {
    _tag: 'ArrayUD',
    label,
    decode: decode as any,
    item
  }
}

export interface NonEmptyArrayUD<Item extends AnyUD>
  extends UDecoder<ErrorOf<Item> | NonExistentZeroIndexE | UnknownArrayE, NonEmptyArray<TypeOf<Item>>> {
  readonly _tag: 'NonEmptyArrayUD'
  readonly item: Item
}

export function nonEmptyArray<Item extends AnyUD>(item: Item): NonEmptyArrayUD<Item> {
  const { decode, label } = compose_(UnknownNonEmptyArray, fromNonEmptyArray(item) as any)
  return {
    _tag: 'NonEmptyArrayUD',
    label,
    decode: decode as any,
    item
  }
}

export interface TupleUD<C extends ReadonlyArray<AnyUD>>
  extends UDecoder<ErrorOf<C[number]>, { [K in keyof C]: TypeOf<C[K]> }> {
  readonly _tag: 'TupleUD'
  readonly components: C
}

export function tuple<C extends ReadonlyArray<AnyUD>>(...components: C): TupleUD<C> {
  const { decode, label } = compose_(UnknownArray, fromTuple(...components) as any)
  return {
    _tag: 'TupleUD',
    label,
    components,
    decode: decode as any
  }
}

export interface RecordUD<Codomain extends AnyUD>
  extends UDecoder<ErrorOf<Codomain>, Record<string, TypeOf<Codomain>>> {
  readonly _tag: 'RecordUD'
  readonly codomain: Codomain
}

export function record<Codomain extends AnyUD>(codomain: Codomain): RecordUD<Codomain> {
  const { label, decode } = compose_(UnknownRecord, fromRecord(codomain) as any)
  return {
    _tag: 'RecordUD',
    label,
    codomain,
    decode: decode as any
  }
}

export interface SumUD<T extends string, Members extends Record<string, AnyUD>>
  extends UDecoder<TagE<keyof Members> | ErrorOf<Members[keyof Members]>, TypeOf<Members[keyof Members]>> {
  readonly _tag: 'SumUD'
  readonly tag: T
  readonly members: Members
}

export function sum<T extends string>(
  tag: T
): <Members extends Record<string, AnyUD>>(members: EnsureTag<T, Members>) => SumUD<T, Members> {
  return (members) => {
    const { label, decode } = compose_(UnknownRecord, fromSum(tag)(members) as any)
    return {
      _tag: 'SumUD',
      tag,
      members,
      label,
      decode: decode as any
    }
  }
}

/*
 * -------------------------------------------
 * Composition
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
    decode: flow(from.decode, S.bind(to.decode))
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
    decode: S.succeed
  }
}

/*
 * -------------------------------------------
 * Utilities
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
  | StructD<any>
  | StructUD<any>
  | PartialD<any>
  | PartialUD<any>
  | ArrayD<any>
  | ArrayUD<any>
  | TupleD<any>
  | TupleUD<any>
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

export function withLabel<D extends Decoder<any, any, any>>(decoder: D): D {
  return {
    ...decoder,
    decode: flow(
      decoder.decode,
      S.mapError((e) => new LabeledE(decoder.label, e))
    )
  }
}

export function withMessage_<D extends AnyD>(decoder: D, message: string): D {
  return {
    ...decoder,
    decode: flow(
      decoder.decode,
      S.mapError((e) => new MessageE(message, e))
    )
  }
}

export function withMessage(message: string): <D extends AnyD>(decoder: D) => D {
  return (decoder) => withMessage_(decoder, message)
}

export type PropOf<D, Prop extends PropertyKey> = D extends StructD<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends StructUD<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends PartialD<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends PartialUD<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends IntersectD<infer Ds>
  ? { [K in keyof Ds]: PropOf<Ds[K], Prop> }[number]
  : D extends UnionD<infer Ds>
  ? { [K in keyof Ds]: PropOf<Ds[K], Prop> }[number]
  : D extends Decoder<infer I, infer E, infer A>
  ? Prop extends keyof A
    ? Prop extends keyof I
      ? Decoder<I[Prop], E, A[Prop]>
      : unknown extends I
      ? UDecoder<E, A[Prop]>
      : never
    : never
  : never

export function prop_<D extends AnyD, Prop extends keyof TypeOf<D>>(
  decoder: D,
  prop: Prop
): FSync<void, PropOf<D, Prop>> {
  return S.deferTotal(() => {
    const d = asConcrete(decoder)
    switch (d._tag) {
      case 'StructD':
      case 'StructUD':
      case 'PartialD':
      case 'PartialUD': {
        return prop in d.properties ? S.succeed(d.properties[prop]) : S.fail(undefined)
      }
      case 'UnionD':
      case 'IntersectD': {
        return pipe(
          d.members,
          S.foreach((d: AnyD) =>
            S.matchM_(
              prop_(d, prop),
              (_) => S.unit(),
              (a: AnyD) => S.succeed(a)
            )
          ),
          S.map(A.filter((a): a is AnyD => a !== undefined)),
          S.bind((as) => (as.length === 0 ? S.fail(undefined) : S.succeed(as[0])))
        )
      }
      case 'LazyD': {
        return prop_(d.decoder() as AnyD, prop)
      }
      case 'ComposeD': {
        return prop_(d.to as AnyD, prop)
      }
      default: {
        return S.fail(undefined)
      }
    }
  })
}

export function prop<D extends AnyD, Prop extends keyof TypeOf<D>>(
  prop: Prop
): (decoder: D) => FSync<void, PropOf<D, Prop>> {
  return (decoder) => prop_(decoder, prop)
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Category = HKT.instance<P.Category<[HKT.URI<DecoderURI>], V>>({
  compose_,
  compose,
  id
})

export { DecoderURI }
