import * as A from "@principia/core/Array";
import * as E from "@principia/core/Either";
import * as R from "@principia/core/Record";
import type * as P from "@principia/prelude";
import { apF_, chainF_, pureF } from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import { _intersect, memoize } from "../utils";
import { fromRefinement } from "./constructors";
import type { Infer, InputOf, KleisliDecoder, KleisliDecoder2, TypeOf } from "./KleisliDecoder";

export function compose_<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Monad<M, C & HKT.Fix<"E", E>>
): <I0, A, B, N extends string, K, Q, W, X, I, S, R, N1 extends string, K1, Q1, W1, X1, I1, S1, R1>(
   ia: KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, A>,
   ab: KleisliDecoder<M, C, A, N1, K1, Q1, W1, X1, I1, S1, R1, E, B>
) => KleisliDecoder<
   M,
   C,
   I0,
   HKT.Mix<C, "N", [N, N1]>,
   HKT.Mix<C, "K", [K, K1]>,
   HKT.Mix<C, "Q", [Q, Q1]>,
   HKT.Mix<C, "W", [W, W1]>,
   HKT.Mix<C, "X", [X, X1]>,
   HKT.Mix<C, "I", [I, I1]>,
   HKT.Mix<C, "S", [S, S1]>,
   HKT.Mix<C, "R", [R, R1]>,
   E,
   B
>;
export function compose_<E, M>(
   M: P.Monad<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <I0, A, B>(ia: KleisliDecoder2<M, I0, E, A>, ab: KleisliDecoder2<M, A, E, B>) => KleisliDecoder2<M, I0, E, B> {
   return (ia, ab) => ({
      decode: (i0) => chainF_(M)(ia.decode(i0), ab.decode)
   });
}

export function compose<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Monad<M, C & HKT.Fix<"E", E>>
): <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, A, B>(
   ab: KleisliDecoder<M, C, A, N1, K1, Q1, W1, X1, I1, S1, R1, E, B>
) => <I0, A, B, N extends string, K, Q, W, X, I, S, R>(
   ia: KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, A>
) => KleisliDecoder<
   M,
   C,
   I0,
   HKT.Mix<C, "N", [N, N1]>,
   HKT.Mix<C, "K", [K, K1]>,
   HKT.Mix<C, "Q", [Q, Q1]>,
   HKT.Mix<C, "W", [W, W1]>,
   HKT.Mix<C, "X", [X, X1]>,
   HKT.Mix<C, "I", [I, I1]>,
   HKT.Mix<C, "S", [S, S1]>,
   HKT.Mix<C, "R", [R, R1]>,
   E,
   B
>;
export function compose<E, M>(
   M: P.Monad<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <A, B>(ab: KleisliDecoder2<M, A, E, B>) => <I0>(ia: KleisliDecoder2<M, I0, E, A>) => KleisliDecoder2<M, I0, E, B> {
   return (ab) => (ia) => compose_(M)(ia, ab);
}

export function refine_<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.MonadFail<M, C & HKT.Fix<"E", E>>
): <I0, A, B extends A, N extends string, K, Q, W, X, I, S, R>(
   from: KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, A>,
   refinement: (a: A) => a is B,
   onError: (a: A) => E
) => KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, B>;
export function refine_<E, M>(M: P.MonadFail<HKT.UHKT2<M>, HKT.Fix<"E", E>>) {
   return <I0, A>(
      from: KleisliDecoder2<M, I0, E, A>,
      refinement: (a: A) => a is A,
      onError: (a: A) => E
   ): KleisliDecoder2<M, I0, E, A> => compose_(M)(from, fromRefinement(M)(refinement, onError));
}

export function refine<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.MonadFail<M, C & HKT.Fix<"E", E>>
): <A, B extends A>(
   refinement: (a: A) => a is B,
   onError: (a: A) => E
) => <I0, N extends string, K, Q, W, X, I, S, R>(
   from: KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, A>
) => KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, B>;
export function refine<E, M>(M: P.MonadFail<HKT.UHKT2<M>, HKT.Fix<"E", E>>) {
   return <A>(refinement: (a: A) => a is A, onError: (a: A) => E) => <I0>(
      from: KleisliDecoder2<M, I0, E, A>
   ): KleisliDecoder2<M, I0, E, A> => refine_(M)(from, refinement, onError);
}

export function parse_<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Monad<M, C & HKT.Fix<"E", E>>
): <I0, N extends string, K, Q, W, X, I, S, R, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, B>(
   from: KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, A>,
   decode: (a: A) => HKT.Kind<M, C, N1, K1, Q1, W1, X1, I1, S1, R1, E, B>
) => KleisliDecoder<
   M,
   C,
   I0,
   HKT.Mix<C, "N", [N, N1]>,
   HKT.Mix<C, "K", [K, K1]>,
   HKT.Mix<C, "Q", [Q, Q1]>,
   HKT.Mix<C, "W", [W, W1]>,
   HKT.Mix<C, "X", [X, X1]>,
   HKT.Mix<C, "I", [I, I1]>,
   HKT.Mix<C, "S", [S, S1]>,
   HKT.Mix<C, "R", [R, R1]>,
   E,
   B
>;
export function parse_<E, M>(
   M: P.Monad<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <I0, A, B>(from: KleisliDecoder2<M, I0, E, A>, decode: (a: A) => HKT.HKT2<M, E, B>) => KleisliDecoder2<M, I0, E, B> {
   return (from, decode) => compose_(M)(from, { decode });
}

export function parse<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Monad<M, C & HKT.Fix<"E", E>>
): <A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, B>(
   decode: (a: A) => HKT.Kind<M, C, N1, K1, Q1, W1, X1, I1, S1, R1, E, B>
) => <I0, N extends string, K, Q, W, X, I, S, R>(
   from: KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, A>
) => KleisliDecoder<
   M,
   C,
   I0,
   HKT.Mix<C, "N", [N, N1]>,
   HKT.Mix<C, "K", [K, K1]>,
   HKT.Mix<C, "Q", [Q, Q1]>,
   HKT.Mix<C, "W", [W, W1]>,
   HKT.Mix<C, "X", [X, X1]>,
   HKT.Mix<C, "I", [I, I1]>,
   HKT.Mix<C, "S", [S, S1]>,
   HKT.Mix<C, "R", [R, R1]>,
   E,
   B
>;
export function parse<E, M>(
   M: P.Monad<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <A, B>(
   decode: (a: A) => HKT.HKT2<M, E, B>
) => <I0>(from: KleisliDecoder2<M, I0, E, A>) => KleisliDecoder2<M, I0, E, B> {
   return (decode) => (from) => parse_(M)(from, decode);
}

export function nullable_<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <I0, N extends string, K, Q, W, X, I, S, R, A>(
   or: KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, A>,
   onError: (i: I0, e: E) => E
) => KleisliDecoder<M, C, I0 | null, N, K, Q, W, X, I, S, R, E, A | null>;
export function nullable_<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <I0, A>(
   or: KleisliDecoder2<M, I0, E, A>,
   onError: (i: I0, e: E) => E
) => KleisliDecoder2<M, I0 | null, E, A | null> {
   return (or, onError) => ({
      decode: (i) =>
         i === null
            ? pureF(M)(null)
            : M.bimap_(
                 or.decode(i),
                 (e: E) => onError(i, e),
                 (a) => a
              )
   });
}

export function nullable<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <I0>(
   onError: (i: I0, e: E) => E
) => <N extends string, K, Q, W, X, I, S, R, A>(
   or: KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, A>
) => KleisliDecoder<M, C, I0 | null, N, K, Q, W, X, I, S, R, E, A | null>;
export function nullable<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): <I0>(
   onError: (i: I0, e: E) => E
) => <A>(or: KleisliDecoder2<M, I0, E, A>) => KleisliDecoder2<M, I0 | null, E, A | null> {
   return (onError) => (or) => nullable_(M)(or, onError);
}

export type InferMixStruct<F extends HKT.URIS, TC, P extends HKT.Param, T, KS> = HKT.MixStruct<
   TC,
   P,
   T,
   { [K in keyof KS]: Infer<F, P, KS[K]> }
>;

export type InferMixTuple<F extends HKT.URIS, TC, P extends HKT.Param, T, KT> = HKT.MixStruct<
   TC,
   P,
   T,
   { [K in keyof KT & number]: Infer<F, P, KT[K]> }
>;

export function fromType_<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <
   P extends Record<
      string,
      KleisliDecoder<
         M,
         C,
         any,
         HKT.Intro<C, "N", N, any>,
         HKT.Intro<C, "K", K, any>,
         HKT.Intro<C, "Q", Q, any>,
         HKT.Intro<C, "W", W, any>,
         HKT.Intro<C, "X", X, any>,
         HKT.Intro<C, "I", I, any>,
         HKT.Intro<C, "S", S, any>,
         HKT.Intro<C, "R", R, any>,
         E,
         any
      >
   >,
   N extends string = HKT.Initial<C, "N">,
   K = HKT.Initial<C, "K">,
   Q = HKT.Initial<C, "Q">,
   W = HKT.Initial<C, "W">,
   X = HKT.Initial<C, "X">,
   I = HKT.Initial<C, "I">,
   S = HKT.Initial<C, "S">,
   R = HKT.Initial<C, "R">
>(
   properties: P,
   onPropertyError: (key: string, e: E) => E
) => KleisliDecoder<
   M,
   C,
   { [K in keyof P]: InputOf<M, P[K]> },
   InferMixStruct<M, C, "N", N, P>,
   InferMixStruct<M, C, "K", K, P>,
   InferMixStruct<M, C, "Q", Q, P>,
   InferMixStruct<M, C, "W", W, P>,
   InferMixStruct<M, C, "X", X, P>,
   InferMixStruct<M, C, "I", I, P>,
   InferMixStruct<M, C, "S", S, P>,
   InferMixStruct<M, C, "R", R, P>,
   E,
   { [K in keyof P]: TypeOf<M, P[K]> }
>;
export function fromType_<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): <P extends Record<string, KleisliDecoder2<M, any, E, any>>>(
   properties: P,
   onPropertyError: (key: string, e: E) => E
) => KleisliDecoder2<M, { [K in keyof P]: any }, E, { [K in keyof P]: any }> {
   return (properties, onPropertyError) => ({
      decode: (i) =>
         R.traverseWithIndex_(M)(properties, (key, decoder) =>
            M.first_(decoder.decode(i[key]), (e) => onPropertyError(key, e))
         ) as any
   });
}

export function fromType<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): (
   onPropertyError: (key: string, e: E) => E
) => <
   P extends Record<
      string,
      KleisliDecoder<
         M,
         C,
         any,
         HKT.Intro<C, "N", N, any>,
         HKT.Intro<C, "K", K, any>,
         HKT.Intro<C, "Q", Q, any>,
         HKT.Intro<C, "W", W, any>,
         HKT.Intro<C, "X", X, any>,
         HKT.Intro<C, "I", I, any>,
         HKT.Intro<C, "S", S, any>,
         HKT.Intro<C, "R", R, any>,
         E,
         any
      >
   >,
   N extends string = HKT.Initial<C, "N">,
   K = HKT.Initial<C, "K">,
   Q = HKT.Initial<C, "Q">,
   W = HKT.Initial<C, "W">,
   X = HKT.Initial<C, "X">,
   I = HKT.Initial<C, "I">,
   S = HKT.Initial<C, "S">,
   R = HKT.Initial<C, "R">
>(
   properties: P
) => KleisliDecoder<
   M,
   C,
   { [K in keyof P]: InputOf<M, P[K]> },
   InferMixStruct<M, C, "N", N, P>,
   InferMixStruct<M, C, "K", K, P>,
   InferMixStruct<M, C, "Q", Q, P>,
   InferMixStruct<M, C, "W", W, P>,
   InferMixStruct<M, C, "X", X, P>,
   InferMixStruct<M, C, "I", I, P>,
   InferMixStruct<M, C, "S", S, P>,
   InferMixStruct<M, C, "R", R, P>,
   E,
   { [K in keyof P]: TypeOf<M, P[K]> }
>;
export function fromType<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): (
   onPropertyError: (key: string, e: E) => E
) => <P extends Record<string, KleisliDecoder2<M, any, E, any>>>(
   properties: P
) => KleisliDecoder2<M, { [K in keyof P]: any }, E, { [K in keyof P]: any }> {
   return (onPropertyError) => (properties) => fromType_(M)(properties, onPropertyError);
}

export function fromPartial_<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <
   P extends Record<
      string,
      KleisliDecoder<
         M,
         C,
         any,
         HKT.Intro<C, "N", N, any>,
         HKT.Intro<C, "K", K, any>,
         HKT.Intro<C, "Q", Q, any>,
         HKT.Intro<C, "W", W, any>,
         HKT.Intro<C, "X", X, any>,
         HKT.Intro<C, "I", I, any>,
         HKT.Intro<C, "S", S, any>,
         HKT.Intro<C, "R", R, any>,
         E,
         any
      >
   >,
   N extends string = HKT.Initial<C, "N">,
   K = HKT.Initial<C, "K">,
   Q = HKT.Initial<C, "Q">,
   W = HKT.Initial<C, "W">,
   X = HKT.Initial<C, "X">,
   I = HKT.Initial<C, "I">,
   S = HKT.Initial<C, "S">,
   R = HKT.Initial<C, "R">
>(
   properties: P,
   onPropertyError: (key: string, e: E) => E
) => KleisliDecoder<
   M,
   C,
   Partial<{ [K in keyof P]: InputOf<M, P[K]> }>,
   InferMixStruct<M, C, "N", N, P>,
   InferMixStruct<M, C, "K", K, P>,
   InferMixStruct<M, C, "Q", Q, P>,
   InferMixStruct<M, C, "W", W, P>,
   InferMixStruct<M, C, "X", X, P>,
   InferMixStruct<M, C, "I", I, P>,
   InferMixStruct<M, C, "S", S, P>,
   InferMixStruct<M, C, "R", R, P>,
   E,
   Partial<{ [K in keyof P]: TypeOf<M, P[K]> }>
>;
export function fromPartial_<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): <P extends Record<string, KleisliDecoder2<M, any, E, any>>>(
   properties: P,
   onPropertyError: (key: string, e: E) => E
) => KleisliDecoder2<M, Partial<{ [K in keyof P]: any }>, E, Partial<{ [K in keyof P]: any }>> {
   const traverse = R.traverseWithIndex_(M);
   const pure = pureF(M);
   const undefinedProperty = pure(E.right(undefined));
   const skipProperty = pure(E.left(undefined));

   return (properties, onPropertyError) => ({
      decode: (i) =>
         M.map_(
            traverse(properties, (key, decoder) => {
               const ikey = i[key];
               if (ikey === undefined) {
                  return key in i ? undefinedProperty : skipProperty;
               }
               return M.bimap_(
                  decoder.decode(ikey),
                  (e) => onPropertyError(key, e),
                  (a) => E.right<void, unknown>(a)
               );
            }),
            compactRecord
         ) as any
   });
}

export function fromPartial<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): (
   onPropertyError: (key: string, e: E) => E
) => <
   P extends Record<
      string,
      KleisliDecoder<
         M,
         C,
         any,
         HKT.Intro<C, "N", N, any>,
         HKT.Intro<C, "K", K, any>,
         HKT.Intro<C, "Q", Q, any>,
         HKT.Intro<C, "W", W, any>,
         HKT.Intro<C, "X", X, any>,
         HKT.Intro<C, "I", I, any>,
         HKT.Intro<C, "S", S, any>,
         HKT.Intro<C, "R", R, any>,
         E,
         any
      >
   >,
   N extends string = HKT.Initial<C, "N">,
   K = HKT.Initial<C, "K">,
   Q = HKT.Initial<C, "Q">,
   W = HKT.Initial<C, "W">,
   X = HKT.Initial<C, "X">,
   I = HKT.Initial<C, "I">,
   S = HKT.Initial<C, "S">,
   R = HKT.Initial<C, "R">
>(
   properties: P
) => KleisliDecoder<
   M,
   C,
   Partial<{ [K in keyof P]: InputOf<M, P[K]> }>,
   InferMixStruct<M, C, "N", N, P>,
   InferMixStruct<M, C, "K", K, P>,
   InferMixStruct<M, C, "Q", Q, P>,
   InferMixStruct<M, C, "W", W, P>,
   InferMixStruct<M, C, "X", X, P>,
   InferMixStruct<M, C, "I", I, P>,
   InferMixStruct<M, C, "S", S, P>,
   InferMixStruct<M, C, "R", R, P>,
   E,
   Partial<{ [K in keyof P]: TypeOf<M, P[K]> }>
>;
export function fromPartial<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): (
   onPropertyError: (key: string, e: E) => E
) => <P extends Record<string, KleisliDecoder2<M, any, E, any>>>(
   properties: P
) => KleisliDecoder2<M, Partial<{ [K in keyof P]: any }>, E, Partial<{ [K in keyof P]: any }>> {
   const fromPartialM = fromPartial_(M);
   return (onPropertyError) => (properties) => fromPartialM(properties, onPropertyError);
}

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

export function fromArray_<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <I0, N extends string, K, Q, W, X, I, S, R, A>(
   item: KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, A>,
   onItemError: (index: number, e: E) => E
) => KleisliDecoder<M, C, ReadonlyArray<I0>, N, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>;
export function fromArray_<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <I0, A>(
   item: KleisliDecoder2<M, I0, E, A>,
   onItemError: (index: number, e: E) => E
) => KleisliDecoder2<M, ReadonlyArray<I0>, E, ReadonlyArray<A>> {
   const traverse = A.traverseWithIndex_(M);
   return (item, onItemError) => ({
      decode: (is) => traverse(is, (index, i) => M.first_(item.decode(i), (e: E) => onItemError(index, e)))
   });
}

export function fromArray<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): (
   onItemError: (index: number, e: E) => E
) => <I0, N extends string, K, Q, W, X, I, S, R, A>(
   item: KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, A>
) => KleisliDecoder<M, C, ReadonlyArray<I0>, N, K, Q, W, X, I, S, R, E, ReadonlyArray<A>>;
export function fromArray<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): (
   onItemError: (index: number, e: E) => E
) => <I0, A>(item: KleisliDecoder2<M, I0, E, A>) => KleisliDecoder2<M, ReadonlyArray<I0>, E, ReadonlyArray<A>> {
   const fromArrayM = fromArray_(M);
   return (onItemError) => (item) => fromArrayM(item, onItemError);
}

export function fromRecord_<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <I0, N extends string, K, Q, W, X, I, S, R, A>(
   codomain: KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, A>,
   onKeyError: (key: string, e: E) => E
) => KleisliDecoder<M, C, Record<string, I>, N, K, Q, W, X, I, S, R, E, Record<string, A>>;
export function fromRecord_<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): <I0, A>(
   codomain: KleisliDecoder2<M, I0, E, A>,
   onKeyError: (key: string, e: E) => E
) => KleisliDecoder2<M, Record<string, I0>, E, Record<string, A>> {
   const traverse = R.traverseWithIndex_(M);
   return (codomain, onKeyError) => ({
      decode: (ir) => traverse(ir, (key, i) => M.first_(codomain.decode(i as any), (e) => onKeyError(key, e)))
   });
}

export function fromRecord<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): (
   onKeyError: (key: string, e: E) => E
) => <I0, N extends string, K, Q, W, X, I, S, R, A>(
   codomain: KleisliDecoder<M, C, I0, N, K, Q, W, X, I, S, R, E, A>
) => KleisliDecoder<M, C, Record<string, I>, N, K, Q, W, X, I, S, R, E, Record<string, A>>;
export function fromRecord<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): (
   onKeyError: (key: string, e: E) => E
) => <I0, A>(codomain: KleisliDecoder2<M, I0, E, A>) => KleisliDecoder2<M, Record<string, I0>, E, Record<string, A>> {
   const fromRecordM = fromRecord_(M);
   return (onKeyError) => (codomain) => fromRecordM(codomain, onKeyError);
}

export function fromTuple<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, C>
): (
   onIndexError: (index: number, e: E) => E
) => <
   P extends ReadonlyArray<
      KleisliDecoder<
         M,
         C,
         any,
         HKT.Intro<C, "N", N, any>,
         HKT.Intro<C, "K", K, any>,
         HKT.Intro<C, "Q", Q, any>,
         HKT.Intro<C, "W", W, any>,
         HKT.Intro<C, "X", X, any>,
         HKT.Intro<C, "I", I, any>,
         HKT.Intro<C, "S", S, any>,
         HKT.Intro<C, "R", R, any>,
         E,
         any
      >
   >,
   N extends string = HKT.Initial<C, "N">,
   K = HKT.Initial<C, "K">,
   Q = HKT.Initial<C, "Q">,
   W = HKT.Initial<C, "W">,
   X = HKT.Initial<C, "X">,
   I = HKT.Initial<C, "I">,
   S = HKT.Initial<C, "S">,
   R = HKT.Initial<C, "R">
>(
   ...components: P
) => KleisliDecoder<
   M,
   C,
   { [K in keyof P]: InputOf<M, P[K]> },
   InferMixTuple<M, C, "N", N, P>,
   InferMixTuple<M, C, "K", K, P>,
   InferMixTuple<M, C, "Q", Q, P>,
   InferMixTuple<M, C, "W", W, P>,
   InferMixTuple<M, C, "X", X, P>,
   InferMixTuple<M, C, "I", I, P>,
   InferMixTuple<M, C, "S", S, P>,
   InferMixTuple<M, C, "R", R, P>,
   E,
   { [K in keyof P]: TypeOf<M, P[K]> }
>;
export function fromTuple<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): (
   onIndexError: (index: number, e: E) => E
) => <P extends ReadonlyArray<KleisliDecoder2<M, any, E, any>>>(
   ...components: P
) => KleisliDecoder2<M, { [K in keyof P]: any }, E, { [K in keyof P]: any }> {
   const traverse = A.traverseWithIndex_(M);
   return (onIndexError) => (...components) => ({
      decode: (is) =>
         traverse(components, (index, decoder) =>
            M.first_(decoder.decode(is[index]), (e) => onIndexError(index, e))
         ) as any
   });
}

export function union<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Alt<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, C>
): (
   onMemberError: (index: number, e: E) => E
) => <
   P extends readonly [
      KleisliDecoder<
         M,
         C,
         any,
         HKT.Intro<C, "N", N, any>,
         HKT.Intro<C, "K", K, any>,
         HKT.Intro<C, "Q", Q, any>,
         HKT.Intro<C, "W", W, any>,
         HKT.Intro<C, "X", X, any>,
         HKT.Intro<C, "I", I, any>,
         HKT.Intro<C, "S", S, any>,
         HKT.Intro<C, "R", R, any>,
         E,
         any
      >,
      ...ReadonlyArray<
         KleisliDecoder<
            M,
            C,
            any,
            HKT.Intro<C, "N", N, any>,
            HKT.Intro<C, "K", K, any>,
            HKT.Intro<C, "Q", Q, any>,
            HKT.Intro<C, "W", W, any>,
            HKT.Intro<C, "X", X, any>,
            HKT.Intro<C, "I", I, any>,
            HKT.Intro<C, "S", S, any>,
            HKT.Intro<C, "R", R, any>,
            E,
            any
         >
      >
   ],
   N extends string = HKT.Initial<C, "N">,
   K = HKT.Initial<C, "K">,
   Q = HKT.Initial<C, "Q">,
   W = HKT.Initial<C, "W">,
   X = HKT.Initial<C, "X">,
   I = HKT.Initial<C, "I">,
   S = HKT.Initial<C, "S">,
   R = HKT.Initial<C, "R">
>(
   ...members: P
) => KleisliDecoder<
   M,
   C,
   InputOf<M, P[keyof P]>,
   InferMixTuple<M, C, "N", N, P>,
   InferMixTuple<M, C, "K", K, P>,
   InferMixTuple<M, C, "Q", Q, P>,
   InferMixTuple<M, C, "W", W, P>,
   InferMixTuple<M, C, "X", X, P>,
   InferMixTuple<M, C, "I", I, P>,
   InferMixTuple<M, C, "S", S, P>,
   InferMixTuple<M, C, "R", R, P>,
   E,
   TypeOf<M, P[keyof P]>
>;
export function union<E, M>(
   M: P.Alt<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): (
   onMemberError: (index: number, e: E) => E
) => <P extends [KleisliDecoder2<M, any, E, any>, ...ReadonlyArray<KleisliDecoder2<M, any, E, any>>]>(
   ...components: P
) => KleisliDecoder2<M, any, E, any> {
   return (onMemberError) => (...members) => ({
      decode: (i) => {
         let out = M.first_(members[0].decode(i), (e) => onMemberError(0, e));
         for (let index = 1; index < members.length; index++) {
            out = M.alt_(out, () => M.first_(members[index].decode(i), (e) => onMemberError(index, e)));
         }
         return out;
      }
   });
}

export function intersect_<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>>
): <IA, A, N extends string, K, Q, W, X, I, S, R, IB, B, N1 extends string, K1, Q1, W1, X1, I1, S1, R1>(
   left: KleisliDecoder<M, C, IA, N, K, Q, W, X, I, S, R, E, A>,
   right: KleisliDecoder<M, C, IB, N1, K1, Q1, W1, X1, I1, S1, R1, E, B>
) => KleisliDecoder<
   M,
   C,
   IA & IB,
   HKT.Mix<C, "N", [N, N1]>,
   HKT.Mix<C, "K", [K, K1]>,
   HKT.Mix<C, "Q", [Q, Q1]>,
   HKT.Mix<C, "W", [W, W1]>,
   HKT.Mix<C, "X", [X, X1]>,
   HKT.Mix<C, "I", [I, I1]>,
   HKT.Mix<C, "S", [S, S1]>,
   HKT.Mix<C, "R", [R, R1]>,
   E,
   A & B
>;
export function intersect_<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <IA, A, IB, B>(
   ia: KleisliDecoder2<M, IA, E, A>,
   ab: KleisliDecoder2<M, IB, E, B>
) => KleisliDecoder2<M, IA & IB, E, A & B> {
   const ap = apF_(M);
   return <IA, A, IB, B>(
      left: KleisliDecoder2<M, IA, E, A>,
      right: KleisliDecoder2<M, IB, E, B>
   ): KleisliDecoder2<M, IA & IB, E, A & B> => ({
      decode: (i) =>
         ap(
            M.map_(left.decode(i), (a: A) => (b: B) => _intersect(a, b)),
            right.decode(i)
         )
   });
}

export function intersect<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>>
): <IB, B, N1 extends string, K1, Q1, W1, X1, I1, S1, R1>(
   right: KleisliDecoder<M, C, IB, N1, K1, Q1, W1, X1, I1, S1, R1, E, B>
) => <IA, A, N extends string, K, Q, W, X, I, S, R>(
   left: KleisliDecoder<M, C, IA, N, K, Q, W, X, I, S, R, E, A>
) => KleisliDecoder<
   M,
   C,
   IA & IB,
   HKT.Mix<C, "N", [N, N1]>,
   HKT.Mix<C, "K", [K, K1]>,
   HKT.Mix<C, "Q", [Q, Q1]>,
   HKT.Mix<C, "W", [W, W1]>,
   HKT.Mix<C, "X", [X, X1]>,
   HKT.Mix<C, "I", [I, I1]>,
   HKT.Mix<C, "S", [S, S1]>,
   HKT.Mix<C, "R", [R, R1]>,
   E,
   A & B
>;
export function intersect<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <IB, B>(
   right: KleisliDecoder2<M, IB, E, B>
) => <IA, A>(left: KleisliDecoder2<M, IA, E, A>) => KleisliDecoder2<M, IA & IB, E, A & B> {
   return (right) => (left) => intersect_(M)(left, right);
}

export function fromSum_<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.MonadFail<M, C & HKT.Fix<"E", E>>
): <
   T extends string,
   P extends Record<
      string,
      KleisliDecoder<
         M,
         C,
         any,
         HKT.Intro<C, "N", N, any>,
         HKT.Intro<C, "K", K, any>,
         HKT.Intro<C, "Q", Q, any>,
         HKT.Intro<C, "W", W, any>,
         HKT.Intro<C, "X", X, any>,
         HKT.Intro<C, "I", I, any>,
         HKT.Intro<C, "S", S, any>,
         HKT.Intro<C, "R", R, any>,
         E,
         any
      >
   >,
   N extends string = HKT.Initial<C, "N">,
   K = HKT.Initial<C, "K">,
   Q = HKT.Initial<C, "Q">,
   W = HKT.Initial<C, "W">,
   X = HKT.Initial<C, "X">,
   I = HKT.Initial<C, "I">,
   S = HKT.Initial<C, "S">,
   R = HKT.Initial<C, "R">
>(
   tag: T,
   members: P,
   onTagError: (tag: string, vaue: unknown, tags: ReadonlyArray<string>) => E
) => KleisliDecoder<
   M,
   C,
   InputOf<M, P[keyof P]>,
   InferMixStruct<M, C, "N", N, P>,
   InferMixStruct<M, C, "K", K, P>,
   InferMixStruct<M, C, "Q", Q, P>,
   InferMixStruct<M, C, "W", W, P>,
   InferMixStruct<M, C, "X", X, P>,
   InferMixStruct<M, C, "I", I, P>,
   InferMixStruct<M, C, "S", S, P>,
   InferMixStruct<M, C, "R", R, P>,
   E,
   TypeOf<M, P[keyof P]>
>;
export function fromSum_<E, M>(
   M: P.MonadFail<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <T extends string, P extends Record<string, KleisliDecoder2<M, any, E, any>>>(
   tag: T,
   members: P,
   onTagError: (tag: string, value: unknown, tags: ReadonlyArray<string>) => E
) => KleisliDecoder2<M, any, E, any> {
   return (tag, members, onTagError) => {
      const keys = Object.keys(members);
      return {
         decode: (ir) => {
            const v = ir[tag];
            if (v in members) {
               return (members as any)[v].decode(ir);
            }
            return M.fail(onTagError(tag, v, keys));
         }
      };
   };
}

export function fromSum<E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   M: P.MonadFail<M, C & HKT.Fix<"E", E>>
): (
   onTagError: (tag: string, value: unknown, tags: ReadonlyArray<string>) => E
) => <T extends string>(
   tag: T
) => <
   P extends Record<
      string,
      KleisliDecoder<
         M,
         C,
         any,
         HKT.Intro<C, "N", N, any>,
         HKT.Intro<C, "K", K, any>,
         HKT.Intro<C, "Q", Q, any>,
         HKT.Intro<C, "W", W, any>,
         HKT.Intro<C, "X", X, any>,
         HKT.Intro<C, "I", I, any>,
         HKT.Intro<C, "S", S, any>,
         HKT.Intro<C, "R", R, any>,
         E,
         any
      >
   >,
   N extends string = HKT.Initial<C, "N">,
   K = HKT.Initial<C, "K">,
   Q = HKT.Initial<C, "Q">,
   W = HKT.Initial<C, "W">,
   X = HKT.Initial<C, "X">,
   I = HKT.Initial<C, "I">,
   S = HKT.Initial<C, "S">,
   R = HKT.Initial<C, "R">
>(
   members: P
) => KleisliDecoder<
   M,
   C,
   InputOf<M, P[keyof P]>,
   InferMixStruct<M, C, "N", N, P>,
   InferMixStruct<M, C, "K", K, P>,
   InferMixStruct<M, C, "Q", Q, P>,
   InferMixStruct<M, C, "W", W, P>,
   InferMixStruct<M, C, "X", X, P>,
   InferMixStruct<M, C, "I", I, P>,
   InferMixStruct<M, C, "S", S, P>,
   InferMixStruct<M, C, "R", R, P>,
   E,
   TypeOf<M, P[keyof P]>
>;
export function fromSum<E, M>(
   M: P.MonadFail<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): (
   onTagError: (tag: string, value: unknown, tags: ReadonlyArray<string>) => E
) => <T extends string>(
   tag: T
) => <P extends Record<string, KleisliDecoder2<M, any, E, any>>>(members: P) => KleisliDecoder2<M, any, E, any> {
   return (onTagError) => (tag) => (members) => fromSum_(M)(tag, members, onTagError);
}

export function lazy_<M extends HKT.URIS, C>(
   M: P.Bifunctor<M, C>
): <I0, N extends string, K, Q, W, X, I, S, R, E, A>(
   id: string,
   f: () => KleisliDecoder<M, C & HKT.Fix<"E", E>, I0, N, K, Q, W, X, I, S, R, E, A>,
   onError: (id: string, e: E) => E
) => KleisliDecoder<M, C & HKT.Fix<"E", E>, I0, N, K, Q, W, X, I, S, R, E, A>;
export function lazy_<E, M>(
   M: P.Bifunctor<HKT.UHKT2<M>>
): <I0, A>(
   id: string,
   f: () => KleisliDecoder2<M, I0, E, A>,
   onError: (id: string, e: E) => E
) => KleisliDecoder2<M, I0, E, A> {
   return <I0, A>(
      id: string,
      f: () => KleisliDecoder2<M, I0, E, A>,
      onError: (id: string, e: E) => E
   ): KleisliDecoder2<M, I0, E, A> => {
      const get = memoize<void, KleisliDecoder2<M, I0, E, A>>(f);
      return {
         decode: (i) => M.first_(get().decode(i), (e: E) => onError(id, e))
      };
   };
}

export function lazy<M extends HKT.URIS, C>(
   M: P.Bifunctor<M, C>
): <E>(
   onError: (id: string, e: E) => E
) => <I0, N extends string, K, Q, W, X, I, S, R, A>(
   id: string,
   f: () => KleisliDecoder<M, C & HKT.Fix<"E", E>, I0, N, K, Q, W, X, I, S, R, E, A>
) => KleisliDecoder<M, C & HKT.Fix<"E", E>, I0, N, K, Q, W, X, I, S, R, E, A>;
export function lazy<E, M>(
   M: P.Bifunctor<HKT.UHKT2<M>>
): (
   onError: (id: string, e: E) => E
) => <I0, A>(id: string, f: () => KleisliDecoder2<M, I0, E, A>) => KleisliDecoder2<M, I0, E, A> {
   return (onError) => (id, f) => lazy_(M)(id, f, onError);
}

export const id = <E, M extends HKT.URIS, C extends HKT.Fix<"E", E>>(M: P.Applicative<M, C & HKT.Fix<"E", E>>) => <
   A,
   N extends string = HKT.Initial<C, "N">,
   K = HKT.Initial<C, "K">,
   Q = HKT.Initial<C, "Q">,
   W = HKT.Initial<C, "W">,
   X = HKT.Initial<C, "X">,
   I = HKT.Initial<C, "I">,
   S = HKT.Initial<C, "S">,
   R = HKT.Initial<C, "R">
>(): KleisliDecoder<M, C, A, N, K, Q, W, X, I, S, R, E, A> => ({
   decode: pureF(M)
});

export const map_ = <E, F extends HKT.URIS, C extends HKT.Fix<"E", E>>(F: P.Functor<F, C & HKT.Fix<"E", E>>) => <
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   A,
   B
>(
   ia: KleisliDecoder<F, C, I0, N, K, Q, W, X, I, S, R, E, A>,
   f: (a: A) => B
): KleisliDecoder<F, C, I0, N, K, Q, W, X, I, S, R, E, B> => ({
   decode: (i) => F.map_(ia.decode(i), f)
});

export const map = <E, F extends HKT.URIS, C extends HKT.Fix<"E", E>>(F: P.Functor<F, C & HKT.Fix<"E", E>>) => <A, B>(
   f: (a: A) => B
) => <I0, N extends string, K, Q, W, X, I, S, R>(
   ia: KleisliDecoder<F, C, I0, N, K, Q, W, X, I, S, R, E, A>
): KleisliDecoder<F, C, I0, N, K, Q, W, X, I, S, R, E, B> => map_(F)(ia, f);

export function alt_<E, F extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   A: P.Alt<F, C & HKT.Fix<"E", E>>
): <I0, N extends string, K, Q, W, X, I, S, R, A>(
   me: KleisliDecoder<F, C, I0, N, K, Q, W, X, I, S, R, E, A>,
   that: () => KleisliDecoder<F, C, I0, N, K, Q, W, X, I, S, R, E, A>
) => KleisliDecoder<F, C, I0, N, K, Q, W, X, I, S, R, E, A>;
export function alt_<E, F>(
   A: P.Alt<HKT.UHKT2<F>, HKT.Fix<"E", E>>
): <I0, A>(me: KleisliDecoder2<F, I0, E, A>, that: () => KleisliDecoder2<F, I0, E, A>) => KleisliDecoder2<F, I0, E, A> {
   return (me, that) => ({
      decode: (i) => A.alt_(me.decode(i), () => that().decode(i))
   });
}

export function alt<E, F extends HKT.URIS, C extends HKT.Fix<"E", E>>(
   A: P.Alt<F, C & HKT.Fix<"E", E>>
): <I0, N extends string, K, Q, W, X, I, S, R, A>(
   that: () => KleisliDecoder<F, C, I0, N, K, Q, W, X, I, S, R, E, A>
) => (
   me: KleisliDecoder<F, C, I0, N, K, Q, W, X, I, S, R, E, A>
) => KleisliDecoder<F, C, I0, N, K, Q, W, X, I, S, R, E, A>;
export function alt<E, F>(
   A: P.Alt<HKT.UHKT2<F>, HKT.Fix<"E", E>>
): <I0, A>(
   that: () => KleisliDecoder2<F, I0, E, A>
) => (me: KleisliDecoder2<F, I0, E, A>) => KleisliDecoder2<F, I0, E, A> {
   return (that) => (me) => alt_(A)(me, that);
}
