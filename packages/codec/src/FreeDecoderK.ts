import type { MonadDecoder, V } from './MonadDecoder'
import type * as HKT from '@principia/base/HKT'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Predicate } from '@principia/base/Predicate'
import type { Refinement } from '@principia/base/Refinement'
import type { Primitive } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { identity, memoize } from '@principia/base/function'
import * as G from '@principia/base/Guard'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'

import { FreeDecoderKURI } from './Modules'
import { _intersect } from './util'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface FreeDecoderK<I, E, O> {
  readonly _I?: () => I
  readonly _E?: () => E
  readonly _O?: () => O
  readonly decode: <M extends HKT.URIS, C = HKT.Auto>(
    M: MonadDecoder<M, C, E>
  ) => (
    i: I
  ) => HKT.Kind<
    M,
    V<C, E>,
    HKT.Initial<C, 'N'>,
    HKT.Initial<C, 'K'>,
    HKT.Initial<C, 'Q'>,
    HKT.Initial<C, 'W'>,
    HKT.Initial<C, 'X'>,
    HKT.Initial<C, 'I'>,
    HKT.Initial<C, 'S'>,
    HKT.Initial<C, 'R'>,
    E,
    O
  >
}

export type InputOf<KD> = [KD] extends [FreeDecoderK<infer I, any, any>] ? I : never
export type TypeOf<KD> = [KD] extends [FreeDecoderK<any, any, infer O>] ? O : never

export type InputOfHKT<KD> = [KD] extends [DecoderKHKT<infer I, any, any>] ? I : never
export type TypeOfHKT<KD> = [KD] extends [DecoderKHKT<any, any, infer O>] ? O : never

export interface DecoderKHKT<I, E, O> {
  readonly _I?: () => I
  readonly _E?: () => E
  readonly _O?: () => O
  readonly decode: <M>(M: MonadDecoder<HKT.UHKT2<M>, HKT.Auto, E>) => (i: I) => HKT.HKT2<M, E, O>
}

interface DecodeFnHKT<I, E, O> {
  (M: MonadDecoder<HKT.UHKT2<any>, HKT.Auto, E>): (i: I) => HKT.HKT2<any, E, O>
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function makeDecoderK<I, E, O>(decode: DecodeFnHKT<I, E, O>): FreeDecoderK<I, E, O> {
  return {
    decode: decode as any
  }
}

export function fromRefinement<I, A extends I, E>(
  refinement: Refinement<I, A>,
  onError: (i: I) => E
): FreeDecoderK<I, E, A>
export function fromRefinement<I, E>(predicate: Predicate<I>, onError: (i: I) => E): FreeDecoderK<I, E, I>
export function fromRefinement<I, E>(predicate: Predicate<I>, onError: (i: I) => E): FreeDecoderK<I, E, I> {
  return {
    decode: (M) => (i) => (predicate(i) ? M.pure(i) : M.fail(onError(i) as any))
  }
}

export function literal<I, E>(onError: (i: I, values: NonEmptyArray<Primitive>) => E) {
  return <A extends readonly [Primitive, ...Primitive[]]>(...values: A): FreeDecoderK<I, E, A[number]> => ({
    decode: (M) => (i) => (G.literal(...values).is(i) ? M.pure(i as A[number]) : M.fail(onError(i, values) as any))
  })
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function mapLeftWithInput_<I, E, A>(
  decoder: FreeDecoderK<I, E, A>,
  f: (i: I, e: E) => E
): FreeDecoderK<I, E, A> {
  return {
    decode: (M) => (i) => M.mapLeft_(decoder.decode(M)(i), (e) => f(i, e))
  }
}

export function mapLeftWithInput<I, E>(
  f: (i: I, e: E) => E
): <A>(decoder: FreeDecoderK<I, E, A>) => FreeDecoderK<I, E, A> {
  return (decoder) => mapLeftWithInput_(decoder, f)
}

export function refine_<I, E, A, B extends A>(
  from: FreeDecoderK<I, E, A>,
  refinement: Refinement<A, B>,
  onError: (a: A) => E
): FreeDecoderK<I, E, B>
export function refine_<I, E, A>(
  from: FreeDecoderK<I, E, A>,
  predicate: Predicate<A>,
  onError: (a: A) => E
): FreeDecoderK<I, E, A>
export function refine_<I, E, A>(
  from: FreeDecoderK<I, E, A>,
  predicate: Predicate<A>,
  onError: (a: A) => E
): FreeDecoderK<I, E, A> {
  return compose_(from, fromRefinement(predicate, onError))
}

export function refine<A, B extends A, E>(
  refinement: Refinement<A, B>,
  onError: (a: A) => E
): <I>(from: FreeDecoderK<I, E, A>) => FreeDecoderK<I, E, B> {
  return (from) => refine_(from, refinement, onError)
}

export function parse_<I, E, A, B>(
  from: FreeDecoderK<I, E, A>,
  decode: <M extends HKT.URIS, C = HKT.Auto>(
    M: MonadDecoder<M, C, E>
  ) => (
    a: A
  ) => HKT.Kind<
    M,
    C,
    HKT.Initial<C, 'N'>,
    HKT.Initial<C, 'K'>,
    HKT.Initial<C, 'Q'>,
    HKT.Initial<C, 'W'>,
    HKT.Initial<C, 'X'>,
    HKT.Initial<C, 'I'>,
    HKT.Initial<C, 'S'>,
    HKT.Initial<C, 'R'>,
    E,
    B
  >
): FreeDecoderK<I, E, B> {
  return compose_(from, { decode })
}

export function parse<A, E, B>(
  decode: <M extends HKT.URIS, C = HKT.Auto>(
    M: MonadDecoder<M, C, E>
  ) => (
    a: A
  ) => HKT.Kind<
    M,
    C,
    HKT.Initial<C, 'N'>,
    HKT.Initial<C, 'K'>,
    HKT.Initial<C, 'Q'>,
    HKT.Initial<C, 'W'>,
    HKT.Initial<C, 'X'>,
    HKT.Initial<C, 'I'>,
    HKT.Initial<C, 'S'>,
    HKT.Initial<C, 'R'>,
    E,
    B
  >
): <I>(from: FreeDecoderK<I, E, A>) => FreeDecoderK<I, E, B> {
  return (from) => parse_(from, decode)
}

export function nullable_<I, E, A>(
  or: FreeDecoderK<I, E, A>,
  onError: (i: I, e: E) => E
): FreeDecoderK<I | null | undefined, E, A | null>
export function nullable_<I, E, A>(
  or: DecoderKHKT<I, E, A>,
  onError: (i: I, e: E) => E
): DecoderKHKT<I | null | undefined, E, A | null> {
  return {
    decode: (M) => (i) => (i == null ? M.pure(null) : M.bimap_(or.decode(M)(i), (e: E) => onError(i, e), identity))
  }
}

export function nullable<I, E>(
  onError: (i: I, e: E) => E
): <A>(or: FreeDecoderK<I, E, A>) => FreeDecoderK<I | null | undefined, E, A | null> {
  return (or) => nullable_(or, onError)
}

export function optional_<I, E, A>(
  or: FreeDecoderK<I, E, A>,
  onError: (i: I, e: E) => E
): FreeDecoderK<I | null | undefined, E, O.Option<A>>
export function optional_<I, E, A>(
  or: DecoderKHKT<I, E, A>,
  onError: (i: I, e: E) => E
): DecoderKHKT<I | null | undefined, E, O.Option<A>> {
  return {
    decode: (M) => (i) => (i == null ? M.pure(O.None()) : M.bimap_(or.decode(M)(i), (e: E) => onError(i, e), O.Some))
  }
}

export function optional<I, E>(
  onError: (i: I, e: E) => E
): <A>(or: FreeDecoderK<I, E, A>) => FreeDecoderK<I | null | undefined, E, O.Option<A>> {
  return (or) => optional_(or, onError)
}

export function fromStruct_<E, P extends Record<string, FreeDecoderK<any, E, any>>>(
  properties: P,
  onPropertyError: (key: string, e: E) => E
): FreeDecoderK<{ [K in keyof P]: InputOf<P[K]> }, E, { [K in keyof P]: TypeOf<P[K]> }>
export function fromStruct_<E, P extends Record<string, DecoderKHKT<any, E, any>>>(
  properties: P,
  onPropertyError: (key: string, e: E) => E
): DecoderKHKT<{ [K in keyof P]: InputOfHKT<P[K]> }, E, { [K in keyof P]: TypeOfHKT<P[K]> }> {
  return {
    decode: (M) => (i) =>
      R.itraverse_(M)(properties, (key, decoder) =>
        M.mapLeft_(decoder.decode(M)(i[key]), (e: E) => onPropertyError(key, e))
      ) as any
  }
}

export function fromStruct<E>(
  onPropertyError: (key: string, e: E) => E
): <P extends Record<string, FreeDecoderK<any, E, any>>>(
  properties: P
) => FreeDecoderK<{ [K in keyof P]: InputOf<P[K]> }, E, { [K in keyof P]: TypeOf<P[K]> }> {
  return (properties) => fromStruct_(properties, onPropertyError)
}

export function fromPartial_<E, P extends Record<string, FreeDecoderK<any, E, any>>>(
  properties: P,
  onPropertyError: (key: string, e: E) => E
): FreeDecoderK<Partial<{ [K in keyof P]: InputOf<P[K]> }>, E, Partial<{ [K in keyof P]: TypeOf<P[K]> }>>
export function fromPartial_<E, P extends Record<string, DecoderKHKT<any, E, any>>>(
  properties: P,
  onPropertyError: (key: string, e: E) => E
): DecoderKHKT<Partial<{ [K in keyof P]: InputOfHKT<P[K]> }>, E, Partial<{ [K in keyof P]: TypeOfHKT<P[K]> }>> {
  return {
    decode: (M) => {
      const traverse          = R.itraverse_(M)
      const undefinedProperty = M.pure(E.Right(undefined))
      const skipProperty      = M.pure(E.Left(undefined))
      return (i) =>
        M.map_(
          traverse(properties, (key, decoder) => {
            const ikey = i[key]
            if (ikey === undefined) {
              return key in i ? undefinedProperty : skipProperty
            }
            return M.bimap_(
              decoder.decode(M)(ikey),
              (e: E) => onPropertyError(key, e),
              (a) => E.Right<void, unknown>(a)
            )
          }),
          compactRecord
        ) as any
    }
  }
}

export function fromPartial<E>(
  onPropertyError: (key: string, e: E) => E
): <P extends Record<string, FreeDecoderK<any, E, any>>>(
  properties: P
) => FreeDecoderK<Partial<{ [K in keyof P]: InputOf<P[K]> }>, E, Partial<{ [K in keyof P]: TypeOf<P[K]> }>> {
  return (properties) => fromPartial_(properties, onPropertyError)
}

export function fromArray_<I, E, A>(
  item: FreeDecoderK<I, E, A>,
  onItemError: (index: number, e: E) => E
): FreeDecoderK<ReadonlyArray<I>, E, ReadonlyArray<A>>
export function fromArray_<I, E, A>(
  item: DecoderKHKT<I, E, A>,
  onItemError: (index: number, e: E) => E
): DecoderKHKT<ReadonlyArray<I>, E, ReadonlyArray<A>> {
  return {
    decode: (M) => {
      const traverse = A.itraverse_(M)
      const itemM    = item.decode(M)
      return (is) => traverse(is, (index, i) => M.mapLeft_(itemM(i), (e: E) => onItemError(index, e)))
    }
  }
}

export function fromArray<E>(
  onItemError: (index: number, e: E) => E
): <I, A>(item: FreeDecoderK<I, E, A>) => FreeDecoderK<ReadonlyArray<I>, E, ReadonlyArray<A>> {
  return (item) => fromArray_(item, onItemError)
}

export function fromRecord_<I, E, A>(
  codomain: FreeDecoderK<I, E, A>,
  onKeyError: (key: string, e: E) => E
): FreeDecoderK<Record<string, I>, E, Record<string, A>> {
  return {
    decode: (M) => {
      const traverse  = R.itraverse_(M)
      const codomainM = codomain.decode(M)
      return (ir) => traverse(ir, (key, i: I) => M.mapLeft_(codomainM(i), (e) => onKeyError(key, e)))
    }
  }
}

export function fromRecord<E>(
  onKeyError: (key: string, e: E) => E
): <I, A>(codomain: FreeDecoderK<I, E, A>) => FreeDecoderK<Record<string, I>, E, Record<string, A>> {
  return (codomain) => fromRecord_(codomain, onKeyError)
}

export function fromTuple<E>(
  onIndexError: (index: number, e: E) => E
): <P extends ReadonlyArray<FreeDecoderK<any, E, any>>>(
  ...components: P
) => FreeDecoderK<{ [K in keyof P]: InputOf<P[K]> }, E, { [K in keyof P]: TypeOf<P[K]> }> {
  return (...components) => ({
    decode: (M) => {
      const traverse = A.itraverse_(M)
      return (is) =>
        traverse(components, (index, decoder) =>
          M.mapLeft_(decoder.decode(M)(is[index]), (e: E) => onIndexError(index, e))
        ) as any
    }
  })
}

export function union<E>(
  onMemberError: (index: number, e: E) => E
): <P extends readonly [FreeDecoderK<any, E, any>, ...FreeDecoderK<any, E, any>[]]>(
  ...members: P
) => FreeDecoderK<InputOf<P[keyof P]>, E, TypeOf<P[keyof P]>>
export function union<E>(
  onMemberError: (index: number, e: E) => E
): <P extends readonly [FreeDecoderK<any, E, any>, ...FreeDecoderK<any, E, any>[]]>(
  ...members: P
) => DecoderKHKT<any, E, any> {
  return (...members) => ({
    decode: (M) => (i) => {
      let out = M.mapLeft_(members[0].decode(M)(i), (e: E) => onMemberError(0, e))
      for (let index = 1; index < members.length; index++) {
        out = M.alt_(out, () => M.mapLeft_(members[index].decode(M)(i), (e: E) => onMemberError(index, e)))
      }
      return out
    }
  })
}

export function intersect_<IA, E, A, IB, B>(
  left: FreeDecoderK<IA, E, A>,
  right: FreeDecoderK<IB, E, B>
): FreeDecoderK<IA & IB, E, A & B>
export function intersect_<IA, E, A, IB, B>(
  left: FreeDecoderK<IA, E, A>,
  right: FreeDecoderK<IB, E, B>
): DecoderKHKT<IA & IB, E, A & B> {
  return {
    decode: (M) => {
      const leftM  = left.decode(M)
      const rightM = right.decode(M)
      return (i) => M.crossWith_(leftM(i), rightM(i), _intersect)
    }
  }
}

export function intersect<IB, E, B>(
  right: FreeDecoderK<IB, E, B>
): <IA, A>(left: FreeDecoderK<IA, E, A>) => FreeDecoderK<IA & IB, E, A & B> {
  return (left) => intersect_(left, right)
}

export function sum<T extends string, E, P extends Record<string, FreeDecoderK<any, E, any>>>(
  tag: T,
  members: P,
  onTagError: (tag: string, value: unknown, tags: ReadonlyArray<string>) => E
): FreeDecoderK<InputOf<P[keyof P]>, E, TypeOf<P[keyof P]>> {
  const keys = Object.keys(members)
  return {
    decode: (M) => (ir) => {
      const v = (ir as any)[tag]
      if (v in members) {
        return (members as any)[v].decode(M)(ir)
      }
      return M.fail(onTagError(tag, v, keys) as any)
    }
  }
}

export function lazy<I, E, A>(
  id: string,
  f: () => FreeDecoderK<I, E, A>,
  onError: (id: string, e: E) => E
): FreeDecoderK<I, E, A> {
  const get = memoize<void, FreeDecoderK<I, E, A>>(f)
  return {
    decode: (M) => (i) => M.mapLeft_(get().decode(M)(i), (e) => onError(id, e))
  }
}

export function runDecoder<I, O, M extends HKT.URIS, C, E>(
  M: MonadDecoder<M, C, E>,
  decoder: FreeDecoderK<I, E, O>
): (
  i: I
) => HKT.Kind<
  M,
  C,
  HKT.Initial<C, 'N'>,
  HKT.Initial<C, 'K'>,
  HKT.Initial<C, 'Q'>,
  HKT.Initial<C, 'W'>,
  HKT.Initial<C, 'X'>,
  HKT.Initial<C, 'I'>,
  HKT.Initial<C, 'S'>,
  HKT.Initial<C, 'R'>,
  E,
  O
> {
  return (i) => decoder.decode(M)(i)
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export function id<E, A>(): FreeDecoderK<A, E, A> {
  return {
    decode: (M) => M.pure
  }
}

export function compose_<I, E, A, B>(ia: FreeDecoderK<I, E, A>, ab: FreeDecoderK<A, E, B>): FreeDecoderK<I, E, B>
export function compose_<I, E, A, B>(ia: DecoderKHKT<I, E, A>, ab: DecoderKHKT<A, E, B>): DecoderKHKT<I, E, B> {
  return {
    decode: (M) => (i0) => M.bind_(ia.decode(M)(i0), ab.decode(M))
  }
}

export function compose<A, E, B>(ab: FreeDecoderK<A, E, B>): <I>(ia: FreeDecoderK<I, E, A>) => FreeDecoderK<I, E, B> {
  return (ia) => compose_(ia, ab)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<I, E, A, B>(ia: FreeDecoderK<I, E, A>, f: (a: A) => B): FreeDecoderK<I, E, B> {
  return {
    decode: (M) => {
      const iaM = ia.decode(M)
      return (i) => M.map_(iaM(i), f)
    }
  }
}

export function map<A, B>(f: (a: A) => B): <I, E>(ia: FreeDecoderK<I, E, A>) => FreeDecoderK<I, E, B> {
  return (ia) => map_(ia, f)
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

export function alt_<I, E, A>(me: FreeDecoderK<I, E, A>, that: () => FreeDecoderK<I, E, A>): FreeDecoderK<I, E, A>
export function alt_<I, E, A>(me: FreeDecoderK<I, E, A>, that: () => FreeDecoderK<I, E, A>): DecoderKHKT<I, E, A> {
  return {
    decode: (M) => {
      const meM = me.decode(M)
      return (i) => M.alt_(meM(i), () => that().decode(M)(i))
    }
  }
}

export function alt<I, E, A>(that: () => FreeDecoderK<I, E, A>): (me: FreeDecoderK<I, E, A>) => FreeDecoderK<I, E, A> {
  return (me) => alt_(me, that)
}

/**
 * @internal
 */
const compactRecord = <A>(r: Record<string, E.Either<void, A>>): Record<string, A> => {
  const mut_out: Record<string, A> = {}
  for (const k in r) {
    const rk = r[k]
    if (E.isRight(rk)) {
      mut_out[k] = rk.right
    }
  }
  return mut_out
}

export { FreeDecoderKURI }
