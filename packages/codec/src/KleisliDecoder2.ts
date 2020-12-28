import type { Refinement } from "@principia/base/data/Function";
import type { NonEmptyArray } from "@principia/base/data/NonEmptyArray";
import type * as HKT from "@principia/base/HKT";
import type * as P from "@principia/base/typeclass";
import type { Literal } from "@principia/base/util/types";

import * as A from "@principia/base/data/Array";
import * as E from "@principia/base/data/Either";
import { identity, memoize, pipe } from "@principia/base/data/Function";
import * as G from "@principia/base/data/Guard";
import * as O from "@principia/base/data/Option";
import * as R from "@principia/base/data/Record";
import { _intersect } from "@principia/codec/util";

export type V<C, E> = C & HKT.Fix<"E", E>;

export type MonadDecoder<M extends HKT.URIS, C, E> = P.MonadFail<M, V<C, E>> &
  P.Bifunctor<M, V<C, E>> &
  P.Alt<M, V<C, E>>;

export interface UnfixedDecoderK<I, E, O> {
  <M extends HKT.URIS, C>(M: MonadDecoder<M, C, E>): (
    i: I
  ) => HKT.Kind<
    M,
    C,
    HKT.Initial<C, "N">,
    HKT.Initial<C, "K">,
    HKT.Initial<C, "Q">,
    HKT.Initial<C, "W">,
    HKT.Initial<C, "X">,
    HKT.Initial<C, "I">,
    HKT.Initial<C, "S">,
    HKT.Initial<C, "R">,
    E,
    O
  >;
}

export type InputOf<KD> = [KD] extends [UnfixedDecoderK<infer I, any, any>] ? I : never;
export type TypeOf<KD> = [KD] extends [UnfixedDecoderK<any, any, infer O>] ? O : never;

export type InputOfHKT<KD> = [KD] extends [DecoderKHKT<infer I, any, any>] ? I : never;
export type TypeOfHKT<KD> = [KD] extends [DecoderKHKT<any, any, infer O>] ? O : never;

interface DecoderKHKT<I, E, O> {
  <M>(M: MonadDecoder<HKT.UHKT2<M>, HKT.Auto, E>): (i: I) => HKT.HKT2<M, E, O>;
}

export function fromRefinement<I, A extends I, E>(
  refinement: Refinement<I, A>,
  onError: (i: I) => E
): UnfixedDecoderK<I, E, A> {
  return (M) => (i) => (refinement(i) ? M.pure(i) : M.fail(onError(i)));
}

export function literal<I, E>(onError: (i: I, values: NonEmptyArray<Literal>) => E) {
  return <A extends readonly [Literal, ...Literal[]]>(
    ...values: A
  ): UnfixedDecoderK<I, E, A[number]> => (M) => (i) =>
    G.literal(...values).is(i) ? M.pure(i as A[number]) : M.fail(onError(i, values));
}

export function mapLeftWithInput_<I, E, A>(
  decoder: UnfixedDecoderK<I, E, A>,
  f: (i: I, e: E) => E
): UnfixedDecoderK<I, E, A> {
  return (M) => (i) => M.mapLeft_(decoder(M)(i), (e) => f(i, e));
}

export function mapLeftWithInput<I, E>(
  f: (i: I, e: E) => E
): <A>(decoder: UnfixedDecoderK<I, E, A>) => UnfixedDecoderK<I, E, A> {
  return (decoder) => mapLeftWithInput_(decoder, f);
}

export function refine_<I, E, A, B extends A>(
  from: UnfixedDecoderK<I, E, A>,
  refinement: Refinement<A, B>,
  onError: (a: A) => E
): UnfixedDecoderK<I, E, B> {
  return compose_(from, fromRefinement(refinement, onError));
}

export function refine<A, B extends A, E>(
  refinement: Refinement<A, B>,
  onError: (a: A) => E
): <I>(from: UnfixedDecoderK<I, E, A>) => UnfixedDecoderK<I, E, B> {
  return (from) => refine_(from, refinement, onError);
}

export function nullable_<I, E, A>(
  or: UnfixedDecoderK<I, E, A>,
  onError: (i: I, e: E) => E
): UnfixedDecoderK<I | null | undefined, E, A | null>;
export function nullable_<I, E, A>(
  or: DecoderKHKT<I, E, A>,
  onError: (i: I, e: E) => E
): DecoderKHKT<I | null | undefined, E, A | null> {
  return (M) => (i) =>
    i == null ? M.pure(null) : M.bimap_(or(M)(i), (e: E) => onError(i, e), identity);
}

export function nullable<I, E>(
  onError: (i: I, e: E) => E
): <A>(or: UnfixedDecoderK<I, E, A>) => UnfixedDecoderK<I | null | undefined, E, A | null> {
  return (or) => nullable_(or, onError);
}

export function optional_<I, E, A>(
  or: UnfixedDecoderK<I, E, A>,
  onError: (i: I, e: E) => E
): UnfixedDecoderK<I | null | undefined, E, O.Option<A>>;
export function optional_<I, E, A>(
  or: DecoderKHKT<I, E, A>,
  onError: (i: I, e: E) => E
): DecoderKHKT<I | null | undefined, E, O.Option<A>> {
  return (M) => (i) =>
    i == null ? M.pure(O.none()) : M.bimap_(or(M)(i), (e: E) => onError(i, e), O.some);
}

export function optional<I, E>(
  onError: (i: I, e: E) => E
): <A>(or: UnfixedDecoderK<I, E, A>) => UnfixedDecoderK<I | null | undefined, E, O.Option<A>> {
  return (or) => optional_(or, onError);
}

export function fromType_<E, P extends Record<string, UnfixedDecoderK<any, E, any>>>(
  properties: P,
  onPropertyError: (key: string, e: E) => E
): UnfixedDecoderK<{ [K in keyof P]: InputOf<P[K]> }, E, { [K in keyof P]: TypeOf<P[K]> }>;
export function fromType_<E, P extends Record<string, DecoderKHKT<any, E, any>>>(
  properties: P,
  onPropertyError: (key: string, e: E) => E
): DecoderKHKT<{ [K in keyof P]: InputOfHKT<P[K]> }, E, { [K in keyof P]: TypeOfHKT<P[K]> }> {
  return (M) => (i) =>
    R.traverseWithIndex_(M)(properties, (key, decoder) =>
      M.mapLeft_(decoder(M)(i[key]), (e: E) => onPropertyError(key, e))
    ) as any;
}

export function fromType<E>(
  onPropertyError: (key: string, e: E) => E
): <P extends Record<string, UnfixedDecoderK<any, E, any>>>(
  properties: P
) => UnfixedDecoderK<{ [K in keyof P]: InputOf<P[K]> }, E, { [K in keyof P]: TypeOf<P[K]> }> {
  return (properties) => fromType_(properties, onPropertyError);
}

export function fromPartial_<E, P extends Record<string, UnfixedDecoderK<any, E, any>>>(
  properties: P,
  onPropertyError: (key: string, e: E) => E
): UnfixedDecoderK<
  Partial<{ [K in keyof P]: InputOf<P[K]> }>,
  E,
  Partial<{ [K in keyof P]: TypeOf<P[K]> }>
>;
export function fromPartial_<E, P extends Record<string, DecoderKHKT<any, E, any>>>(
  properties: P,
  onPropertyError: (key: string, e: E) => E
): DecoderKHKT<
  Partial<{ [K in keyof P]: InputOfHKT<P[K]> }>,
  E,
  Partial<{ [K in keyof P]: TypeOfHKT<P[K]> }>
> {
  return (M) => {
    const traverse = R.traverseWithIndex_(M);
    const undefinedProperty = M.pure(E.right(undefined));
    const skipProperty = M.pure(E.left(undefined));
    return (i) =>
      M.map_(
        traverse(properties, (key, decode) => {
          const ikey = i[key];
          if (ikey === undefined) {
            return key in i ? undefinedProperty : skipProperty;
          }
          return M.bimap_(
            decode(M)(ikey),
            (e: E) => onPropertyError(key, e),
            (a) => E.right<void, unknown>(a)
          );
        }),
        compactRecord
      ) as any;
  };
}

export function fromPartial<E>(
  onPropertyError: (key: string, e: E) => E
): <P extends Record<string, UnfixedDecoderK<any, E, any>>>(
  properties: P
) => UnfixedDecoderK<
  Partial<{ [K in keyof P]: InputOf<P[K]> }>,
  E,
  Partial<{ [K in keyof P]: TypeOf<P[K]> }>
> {
  return (properties) => fromPartial_(properties, onPropertyError);
}

export function fromArray_<I, E, A>(
  item: UnfixedDecoderK<I, E, A>,
  onItemError: (index: number, e: E) => E
): UnfixedDecoderK<ReadonlyArray<I>, E, ReadonlyArray<A>>;
export function fromArray_<I, E, A>(
  item: DecoderKHKT<I, E, A>,
  onItemError: (index: number, e: E) => E
): DecoderKHKT<ReadonlyArray<I>, E, ReadonlyArray<A>> {
  return (M) => {
    const traverse = A.traverseWithIndex_(M);
    const itemM = item(M);
    return (is) =>
      traverse(is, (index, i) => M.mapLeft_(itemM(i), (e: E) => onItemError(index, e)));
  };
}

export function fromArray<E>(
  onItemError: (index: number, e: E) => E
): <I, A>(
  item: UnfixedDecoderK<I, E, A>
) => UnfixedDecoderK<ReadonlyArray<I>, E, ReadonlyArray<A>> {
  return (item) => fromArray_(item, onItemError);
}

export function fromRecord_<I, E, A>(
  codomain: UnfixedDecoderK<I, E, A>,
  onKeyError: (key: string, e: E) => E
): UnfixedDecoderK<Record<string, I>, E, Record<string, A>> {
  return (M) => {
    const traverse = R.traverseWithIndex_(M);
    const codomainM = codomain(M);
    return (ir) => traverse(ir, (key, i: I) => M.mapLeft_(codomainM(i), (e) => onKeyError(key, e)));
  };
}

export function fromRecord<E>(
  onKeyError: (key: string, e: E) => E
): <I, A>(
  codomain: UnfixedDecoderK<I, E, A>
) => UnfixedDecoderK<Record<string, I>, E, Record<string, A>> {
  return (codomain) => fromRecord_(codomain, onKeyError);
}

export function fromTuple<E>(
  onIndexError: (index: number, e: E) => E
): <P extends ReadonlyArray<UnfixedDecoderK<any, E, any>>>(
  ...components: P
) => UnfixedDecoderK<{ [K in keyof P]: InputOf<P[K]> }, E, { [K in keyof P]: TypeOf<P[K]> }> {
  return (...components) => (M) => {
    const traverse = A.traverseWithIndex_(M);
    return (is) =>
      traverse(components, (index, decode) =>
        M.mapLeft_(decode(M)(is[index]), (e: E) => onIndexError(index, e))
      ) as any;
  };
}

export function union<E>(
  onMemberError: (index: number, e: E) => E
): <P extends readonly [UnfixedDecoderK<any, E, any>, ...UnfixedDecoderK<any, E, any>[]]>(
  ...members: P
) => UnfixedDecoderK<InputOf<P[keyof P]>, E, TypeOf<P[keyof P]>>;
export function union<E>(
  onMemberError: (index: number, e: E) => E
): <P extends readonly [UnfixedDecoderK<any, E, any>, ...UnfixedDecoderK<any, E, any>[]]>(
  ...members: P
) => DecoderKHKT<any, E, any> {
  return (...members) => (M) => (i) => {
    let out = M.mapLeft_(members[0](M)(i), (e: E) => onMemberError(0, e));
    for (let index = 1; index < members.length; index++) {
      out = M.alt_(out, () => M.mapLeft_(members[index](M)(i), (e: E) => onMemberError(index, e)));
    }
    return out;
  };
}

export function intersect_<IA, E, A, IB, B>(
  left: UnfixedDecoderK<IA, E, A>,
  right: UnfixedDecoderK<IB, E, B>
): UnfixedDecoderK<IA & IB, E, A & B>;
export function intersect_<IA, E, A, IB, B>(
  left: UnfixedDecoderK<IA, E, A>,
  right: UnfixedDecoderK<IB, E, B>
): DecoderKHKT<IA & IB, E, A & B> {
  return (M) => {
    const leftM = left(M);
    const rightM = right(M);
    return (i) =>
      pipe(
        leftM(i),
        M.map((a: A) => (b: B) => _intersect(a, b)),
        M.ap(rightM(i))
      );
  };
}

export function intersect<IB, E, B>(
  right: UnfixedDecoderK<IB, E, B>
): <IA, A>(left: UnfixedDecoderK<IA, E, A>) => UnfixedDecoderK<IA & IB, E, A & B> {
  return (left) => intersect_(left, right);
}

export function sum<T extends string, E, P extends Record<string, UnfixedDecoderK<any, E, any>>>(
  tag: T,
  members: P,
  onTagError: (tag: string, value: unknown, tags: ReadonlyArray<string>) => E
): UnfixedDecoderK<InputOf<P[keyof P]>, E, TypeOf<P[keyof P]>> {
  const keys = Object.keys(members);
  return (M) => (ir) => {
    const v = (ir as any)[tag];
    if (v in members) {
      return (members as any)[v](M)(ir);
    }
    return M.fail(onTagError(tag, v, keys));
  };
}

export function lazy<I, E, A>(
  id: string,
  f: () => UnfixedDecoderK<I, E, A>,
  onError: (id: string, e: E) => E
): UnfixedDecoderK<I, E, A> {
  const get = memoize<void, UnfixedDecoderK<I, E, A>>(f);
  return (M) => (i) => M.mapLeft_(get()(M)(i), (e) => onError(id, e));
}

export function id<E, A>(): UnfixedDecoderK<A, E, A> {
  return (M) => M.pure;
}

export function compose_<I, E, A, B>(
  ia: UnfixedDecoderK<I, E, A>,
  ab: UnfixedDecoderK<A, E, B>
): UnfixedDecoderK<I, E, B>;
export function compose_<I, E, A, B>(
  ia: DecoderKHKT<I, E, A>,
  ab: DecoderKHKT<A, E, B>
): DecoderKHKT<I, E, B> {
  return (M) => (i0) => M.flatMap_(ia(M)(i0), ab(M));
}

export function compose<A, E, B>(
  ab: UnfixedDecoderK<A, E, B>
): <I>(ia: UnfixedDecoderK<I, E, A>) => UnfixedDecoderK<I, E, B> {
  return (ia) => compose_(ia, ab);
}

export function map_<I, E, A, B>(
  ia: UnfixedDecoderK<I, E, A>,
  f: (a: A) => B
): UnfixedDecoderK<I, E, B> {
  return (M) => {
    const iaM = ia(M);
    return (i) => M.map_(iaM(i), f);
  };
}

export function map<A, B>(
  f: (a: A) => B
): <I, E>(ia: UnfixedDecoderK<I, E, A>) => UnfixedDecoderK<I, E, B> {
  return (ia) => map_(ia, f);
}

export function alt_<I, E, A>(
  me: UnfixedDecoderK<I, E, A>,
  that: () => UnfixedDecoderK<I, E, A>
): UnfixedDecoderK<I, E, A>;
export function alt_<I, E, A>(
  me: UnfixedDecoderK<I, E, A>,
  that: () => UnfixedDecoderK<I, E, A>
): DecoderKHKT<I, E, A> {
  return (M) => {
    const meM = me(M);
    return (i) => M.alt_(meM(i), () => that()(M)(i));
  };
}

export function alt<I, E, A>(
  that: () => UnfixedDecoderK<I, E, A>
): (me: UnfixedDecoderK<I, E, A>) => UnfixedDecoderK<I, E, A> {
  return (me) => alt_(me, that);
}

/**
 * @internal
 */
const compactRecord = <A>(r: Record<string, E.Either<void, A>>): Record<string, A> => {
  const out: Record<string, A> = {};
  for (const k in r) {
    const rk = r[k];
    if (E.isRight(rk)) {
      out[k] = rk.right;
    }
  }
  return out;
};
