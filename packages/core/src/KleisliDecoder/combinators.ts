import type * as P from "@principia/prelude";
import { apF_, chainF_, pureF } from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import * as A from "../Array";
import * as E from "../Either";
import type { Option } from "../Option";
import { none, some } from "../Option";
import * as R from "../Record";
import { _intersect, memoize } from "../Utils";
import { fromRefinement } from "./constructors";
import type { InputOf, KleisliDecoder, KleisliDecoderHKT, TypeOf } from "./model";

export function mapLeftWithInput_<M extends HKT.URIS, C>(
   M: P.Bifunctor<M, C>
): <I, E, A>(decoder: KleisliDecoder<M, C, I, E, A>, f: (i: I, e: E) => E) => KleisliDecoder<M, C, I, E, A> {
   return (decoder, f) => ({
      decode: (i) => M.mapLeft_(decoder.decode(i), (e) => f(i, e))
   });
}

export function mapLeftWithInput<M extends HKT.URIS, C>(
   M: P.Bifunctor<M, C>
): <I, E>(f: (i: I, e: E) => E) => <A>(decoder: KleisliDecoder<M, C, I, E, A>) => KleisliDecoder<M, C, I, E, A> {
   return (f) => (decoder) => mapLeftWithInput_(M)(decoder, f);
}

export function compose_<E, M extends HKT.URIS, C>(
   M: P.Monad<M, C & HKT.Fix<"E", E>>
): <I, A, B>(ia: KleisliDecoder<M, C, I, E, A>, ab: KleisliDecoder<M, C, A, E, B>) => KleisliDecoder<M, C, I, E, B>;
export function compose_<E, M>(
   M: P.Monad<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <I, A, B>(ia: KleisliDecoderHKT<M, I, E, A>, ab: KleisliDecoderHKT<M, A, E, B>) => KleisliDecoderHKT<M, I, E, B> {
   return (ia, ab) => ({
      decode: (i0) => chainF_(M)(ia.decode(i0), ab.decode)
   });
}

export function compose<E, M extends HKT.URIS, C>(
   M: P.Monad<M, C & HKT.Fix<"E", E>>
): <A, B>(
   ab: KleisliDecoder<M, C, A, E, B>
) => <I, A, B>(ia: KleisliDecoder<M, C, I, E, A>) => KleisliDecoder<M, C, I, E, B>;
export function compose<E, M>(
   M: P.Monad<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <A, B>(
   ab: KleisliDecoderHKT<M, A, E, B>
) => <I>(ia: KleisliDecoderHKT<M, I, E, A>) => KleisliDecoderHKT<M, I, E, B> {
   return (ab) => (ia) => compose_(M)(ia, ab);
}

export function refine_<E, M extends HKT.URIS, C>(
   M: P.MonadFail<M, C & HKT.Fix<"E", E>>
): <I, A, B extends A>(
   from: KleisliDecoder<M, C, I, E, A>,
   refinement: (a: A) => a is B,
   onError: (a: A) => E
) => KleisliDecoder<M, C, I, E, B>;
export function refine_<E, M>(M: P.MonadFail<HKT.UHKT2<M>, HKT.Fix<"E", E>>) {
   return <I, A>(
      from: KleisliDecoderHKT<M, I, E, A>,
      refinement: (a: A) => a is A,
      onError: (a: A) => E
   ): KleisliDecoderHKT<M, I, E, A> => compose_(M)(from, fromRefinement(M)(refinement, onError));
}

export function refine<E, M extends HKT.URIS, C>(
   M: P.MonadFail<M, C & HKT.Fix<"E", E>>
): <A, B extends A>(
   refinement: (a: A) => a is B,
   onError: (a: A) => E
) => <I>(from: KleisliDecoder<M, C, I, E, A>) => KleisliDecoder<M, C, I, E, B>;
export function refine<E, M>(M: P.MonadFail<HKT.UHKT2<M>, HKT.Fix<"E", E>>) {
   return <A>(refinement: (a: A) => a is A, onError: (a: A) => E) => <I>(
      from: KleisliDecoderHKT<M, I, E, A>
   ): KleisliDecoderHKT<M, I, E, A> => refine_(M)(from, refinement, onError);
}

export function parse_<E, M extends HKT.URIS, C>(
   M: P.Monad<M, C & HKT.Fix<"E", E>>
): <I, A, B>(
   from: KleisliDecoder<M, C, I, E, A>,
   decode: (
      a: A
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
      B
   >
) => KleisliDecoder<M, C, I, E, B>;
export function parse_<E, M>(
   M: P.Monad<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <I, A, B>(
   from: KleisliDecoderHKT<M, I, E, A>,
   decode: (a: A) => HKT.HKT2<M, E, B>
) => KleisliDecoderHKT<M, I, E, B> {
   return (from, decode) => compose_(M)(from, { decode });
}

export function parse<E, M extends HKT.URIS, C>(
   M: P.Monad<M, C & HKT.Fix<"E", E>>
): <A, B>(
   decode: (
      a: A
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
      B
   >
) => <I>(from: KleisliDecoder<M, C, I, E, A>) => KleisliDecoder<M, C, I, E, B>;
export function parse<E, M>(
   M: P.Monad<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <A, B>(
   decode: (a: A) => HKT.HKT2<M, E, B>
) => <I>(from: KleisliDecoderHKT<M, I, E, A>) => KleisliDecoderHKT<M, I, E, B> {
   return (decode) => (from) => parse_(M)(from, decode);
}

export function nullable_<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <I, A>(
   or: KleisliDecoder<M, C, I, E, A>,
   onError: (i: I, e: E) => E
) => KleisliDecoder<M, C, I | null | undefined, E, A | null>;
export function nullable_<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): <I, A>(
   or: KleisliDecoderHKT<M, I, E, A>,
   onError: (i: I, e: E) => E
) => KleisliDecoderHKT<M, I | null | undefined, E, A | null> {
   return (or, onError) => ({
      decode: (i) =>
         i == null
            ? pureF(M)(null)
            : M.bimap_(
                 or.decode(i),
                 (e: E) => onError(i, e),
                 (a) => a
              )
   });
}

export function nullable<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <I>(
   onError: (i: I, e: E) => E
) => <A>(or: KleisliDecoder<M, C, I, E, A>) => KleisliDecoder<M, C, I | null | undefined, E, A | null>;
export function nullable<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): <I>(
   onError: (i: I, e: E) => E
) => <A>(or: KleisliDecoderHKT<M, I, E, A>) => KleisliDecoderHKT<M, I | null | undefined, E, A | null> {
   return (onError) => (or) => nullable_(M)(or, onError);
}

export function optional_<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <I, A>(
   or: KleisliDecoder<M, C, I, E, A>,
   onError: (i: I, e: E) => E
) => KleisliDecoder<M, C, I | null | undefined, E, Option<A>>;
export function optional_<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): <I, A>(
   or: KleisliDecoderHKT<M, I, E, A>,
   onError: (i: I, e: E) => E
) => KleisliDecoderHKT<M, I | null | undefined, E, Option<A>> {
   return (or, onError) => ({
      decode: (i) =>
         i == null
            ? pureF(M)(none())
            : M.bimap_(
                 or.decode(i),
                 (e) => onError(i, e),
                 (a) => some(a)
              )
   });
}

export function optional<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <I>(
   onError: (i: I, e: E) => E
) => <A>(or: KleisliDecoder<M, C, I, E, A>) => KleisliDecoder<M, C, I | null | undefined, E, Option<A>>;
export function optional<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): <I>(
   onError: (i: I, e: E) => E
) => <A>(or: KleisliDecoderHKT<M, I, E, A>) => KleisliDecoderHKT<M, I | null | undefined, E, Option<A>> {
   return (onError) => (or) => optional_(M)(or, onError);
}

export function fromType_<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <P extends Record<string, KleisliDecoder<M, C, any, E, any>>>(
   properties: P,
   onPropertyError: (key: string, e: E) => E
) => KleisliDecoder<M, C, { [K in keyof P]: InputOf<M, P[K]> }, E, { [K in keyof P]: TypeOf<M, P[K]> }>;
export function fromType_<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): <P extends Record<string, KleisliDecoderHKT<M, any, E, any>>>(
   properties: P,
   onPropertyError: (key: string, e: E) => E
) => KleisliDecoderHKT<M, { [K in keyof P]: any }, E, { [K in keyof P]: any }> {
   return (properties, onPropertyError) => ({
      decode: (i) =>
         R.traverseWithIndex_(M)(properties, (key, decoder) =>
            M.mapLeft_(decoder.decode(i[key]), (e) => onPropertyError(key, e))
         ) as any
   });
}

export function fromType<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): (
   onPropertyError: (key: string, e: E) => E
) => <P extends Record<string, KleisliDecoder<M, C, any, E, any>>>(
   properties: P
) => KleisliDecoder<M, C, { [K in keyof P]: InputOf<M, P[K]> }, E, { [K in keyof P]: TypeOf<M, P[K]> }>;
export function fromType<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): (
   onPropertyError: (key: string, e: E) => E
) => <P extends Record<string, KleisliDecoderHKT<M, any, E, any>>>(
   properties: P
) => KleisliDecoderHKT<M, { [K in keyof P]: any }, E, { [K in keyof P]: any }> {
   return (onPropertyError) => (properties) => fromType_(M)(properties, onPropertyError);
}

export function fromPartial_<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <P extends Record<string, KleisliDecoder<M, C, any, E, any>>>(
   properties: P,
   onPropertyError: (key: string, e: E) => E
) => KleisliDecoder<
   M,
   C,
   Partial<{ [K in keyof P]: InputOf<M, P[K]> }>,
   E,
   Partial<{ [K in keyof P]: TypeOf<M, P[K]> }>
>;
export function fromPartial_<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): <P extends Record<string, KleisliDecoderHKT<M, any, E, any>>>(
   properties: P,
   onPropertyError: (key: string, e: E) => E
) => KleisliDecoderHKT<M, Partial<{ [K in keyof P]: any }>, E, Partial<{ [K in keyof P]: any }>> {
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

export function fromPartial<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): (
   onPropertyError: (key: string, e: E) => E
) => <P extends Record<string, KleisliDecoder<M, C, any, E, any>>>(
   properties: P
) => KleisliDecoder<
   M,
   C,
   Partial<{ [K in keyof P]: InputOf<M, P[K]> }>,
   E,
   Partial<{ [K in keyof P]: TypeOf<M, P[K]> }>
>;
export function fromPartial<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): (
   onPropertyError: (key: string, e: E) => E
) => <P extends Record<string, KleisliDecoderHKT<M, any, E, any>>>(
   properties: P
) => KleisliDecoderHKT<M, Partial<{ [K in keyof P]: any }>, E, Partial<{ [K in keyof P]: any }>> {
   const fromPartialM = fromPartial_(M);
   return (onPropertyError) => (properties) => fromPartialM(properties, onPropertyError);
}

export function fromArray_<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <I, A>(
   item: KleisliDecoder<M, C, I, E, A>,
   onItemError: (index: number, e: E) => E
) => KleisliDecoder<M, C, ReadonlyArray<I>, E, ReadonlyArray<A>>;
export function fromArray_<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <I, A>(
   item: KleisliDecoderHKT<M, I, E, A>,
   onItemError: (index: number, e: E) => E
) => KleisliDecoderHKT<M, ReadonlyArray<I>, E, ReadonlyArray<A>> {
   const traverse = A.traverseWithIndex_(M);
   return (item, onItemError) => ({
      decode: (is) => traverse(is, (index, i) => M.mapLeft_(item.decode(i), (e: E) => onItemError(index, e)))
   });
}

export function fromArray<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): (
   onItemError: (index: number, e: E) => E
) => <I, A>(item: KleisliDecoder<M, C, I, E, A>) => KleisliDecoder<M, C, ReadonlyArray<I>, E, ReadonlyArray<A>>;
export function fromArray<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): (
   onItemError: (index: number, e: E) => E
) => <I, A>(item: KleisliDecoderHKT<M, I, E, A>) => KleisliDecoderHKT<M, ReadonlyArray<I>, E, ReadonlyArray<A>> {
   const fromArrayM = fromArray_(M);
   return (onItemError) => (item) => fromArrayM(item, onItemError);
}

export function fromRecord_<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): <I, A>(
   codomain: KleisliDecoder<M, C, I, E, A>,
   onKeyError: (key: string, e: E) => E
) => KleisliDecoder<M, C, Record<string, I>, E, Record<string, A>>;
export function fromRecord_<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): <I, A>(
   codomain: KleisliDecoderHKT<M, I, E, A>,
   onKeyError: (key: string, e: E) => E
) => KleisliDecoderHKT<M, Record<string, I>, E, Record<string, A>> {
   const traverse = R.traverseWithIndex_(M);
   return (codomain, onKeyError) => ({
      decode: (ir) => traverse(ir, (key, i) => M.mapLeft_(codomain.decode(i as any), (e) => onKeyError(key, e)))
   });
}

export function fromRecord<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, HKT.Unfix<C, "E">>
): (
   onKeyError: (key: string, e: E) => E
) => <I, A>(codomain: KleisliDecoder<M, C, I, E, A>) => KleisliDecoder<M, C, Record<string, I>, E, Record<string, A>>;
export function fromRecord<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): (
   onKeyError: (key: string, e: E) => E
) => <I, A>(codomain: KleisliDecoderHKT<M, I, E, A>) => KleisliDecoderHKT<M, Record<string, I>, E, Record<string, A>> {
   const fromRecordM = fromRecord_(M);
   return (onKeyError) => (codomain) => fromRecordM(codomain, onKeyError);
}

export function fromTuple<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, C>
): (
   onIndexError: (index: number, e: E) => E
) => <P extends ReadonlyArray<KleisliDecoder<M, C, any, E, any>>>(
   ...components: P
) => KleisliDecoder<M, C, { [K in keyof P]: InputOf<M, P[K]> }, E, { [K in keyof P]: TypeOf<M, P[K]> }>;
export function fromTuple<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): (
   onIndexError: (index: number, e: E) => E
) => <P extends ReadonlyArray<KleisliDecoderHKT<M, any, E, any>>>(
   ...components: P
) => KleisliDecoderHKT<M, { [K in keyof P]: any }, E, { [K in keyof P]: any }> {
   const traverse = A.traverseWithIndex_(M);
   return (onIndexError) => (...components) => ({
      decode: (is) =>
         traverse(components, (index, decoder) =>
            M.mapLeft_(decoder.decode(is[index]), (e) => onIndexError(index, e))
         ) as any
   });
}

export function union<E, M extends HKT.URIS, C>(
   M: P.Alt<M, C & HKT.Fix<"E", E>> & P.Bifunctor<M, C>
): (
   onMemberError: (index: number, e: E) => E
) => <P extends readonly [KleisliDecoder<M, C, any, E, any>, ...ReadonlyArray<KleisliDecoder<M, C, any, E, any>>]>(
   ...members: P
) => KleisliDecoder<M, C, InputOf<M, P[keyof P]>, E, TypeOf<M, P[keyof P]>>;
export function union<E, M>(
   M: P.Alt<HKT.UHKT2<M>, HKT.Fix<"E", E>> & P.Bifunctor<HKT.UHKT2<M>>
): (
   onMemberError: (index: number, e: E) => E
) => <P extends [KleisliDecoderHKT<M, any, E, any>, ...ReadonlyArray<KleisliDecoderHKT<M, any, E, any>>]>(
   ...components: P
) => KleisliDecoderHKT<M, any, E, any> {
   return (onMemberError) => (...members) => ({
      decode: (i) => {
         let out = M.mapLeft_(members[0].decode(i), (e) => onMemberError(0, e));
         for (let index = 1; index < members.length; index++) {
            out = M.alt_(out, () => M.mapLeft_(members[index].decode(i), (e) => onMemberError(index, e)));
         }
         return out;
      }
   });
}

export function intersect_<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>>
): <IA, A, IB, B>(
   left: KleisliDecoder<M, C, IA, E, A>,
   right: KleisliDecoder<M, C, IB, E, B>
) => KleisliDecoder<M, C, IA & IB, E, A & B>;
export function intersect_<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <IA, A, IB, B>(
   ia: KleisliDecoderHKT<M, IA, E, A>,
   ab: KleisliDecoderHKT<M, IB, E, B>
) => KleisliDecoderHKT<M, IA & IB, E, A & B> {
   const ap = apF_(M);
   return <IA, A, IB, B>(
      left: KleisliDecoderHKT<M, IA, E, A>,
      right: KleisliDecoderHKT<M, IB, E, B>
   ): KleisliDecoderHKT<M, IA & IB, E, A & B> => ({
      decode: (i) =>
         ap(
            M.map_(left.decode(i), (a: A) => (b: B) => _intersect(a, b)),
            right.decode(i)
         )
   });
}

export function intersect<E, M extends HKT.URIS, C>(
   M: P.Applicative<M, C & HKT.Fix<"E", E>>
): <IB, B>(
   right: KleisliDecoder<M, C, IB, E, B>
) => <IA, A>(left: KleisliDecoder<M, C, IA, E, A>) => KleisliDecoder<M, C, IA & IB, E, A & B>;
export function intersect<E, M>(
   M: P.Applicative<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <IB, B>(
   right: KleisliDecoderHKT<M, IB, E, B>
) => <IA, A>(left: KleisliDecoderHKT<M, IA, E, A>) => KleisliDecoderHKT<M, IA & IB, E, A & B> {
   return (right) => (left) => intersect_(M)(left, right);
}

export function fromSum_<E, M extends HKT.URIS, C>(
   M: P.MonadFail<M, C & HKT.Fix<"E", E>>
): <T extends string, P extends Record<string, KleisliDecoder<M, C, any, E, any>>>(
   tag: T,
   members: P,
   onTagError: (tag: string, vaue: unknown, tags: ReadonlyArray<string>) => E
) => KleisliDecoder<M, C, InputOf<M, P[keyof P]>, E, TypeOf<M, P[keyof P]>>;
export function fromSum_<E, M>(
   M: P.MonadFail<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): <T extends string, P extends Record<string, KleisliDecoderHKT<M, any, E, any>>>(
   tag: T,
   members: P,
   onTagError: (tag: string, value: unknown, tags: ReadonlyArray<string>) => E
) => KleisliDecoderHKT<M, any, E, any> {
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

export function fromSum<E, M extends HKT.URIS, C>(
   M: P.MonadFail<M, C & HKT.Fix<"E", E>>
): (
   onTagError: (tag: string, value: unknown, tags: ReadonlyArray<string>) => E
) => <T extends string>(
   tag: T
) => <P extends Record<string, KleisliDecoder<M, C, any, E, any>>>(
   members: P
) => KleisliDecoder<M, C, InputOf<M, P[keyof P]>, E, TypeOf<M, P[keyof P]>>;
export function fromSum<E, M>(
   M: P.MonadFail<HKT.UHKT2<M>, HKT.Fix<"E", E>>
): (
   onTagError: (tag: string, value: unknown, tags: ReadonlyArray<string>) => E
) => <T extends string>(
   tag: T
) => <P extends Record<string, KleisliDecoderHKT<M, any, E, any>>>(members: P) => KleisliDecoderHKT<M, any, E, any> {
   return (onTagError) => (tag) => (members) => fromSum_(M)(tag, members, onTagError);
}

export function lazy_<M extends HKT.URIS, C>(
   M: P.Bifunctor<M, C>
): <I, E, A>(
   id: string,
   f: () => KleisliDecoder<M, C & HKT.Fix<"E", E>, I, E, A>,
   onError: (id: string, e: E) => E
) => KleisliDecoder<M, C & HKT.Fix<"E", E>, I, E, A>;
export function lazy_<E, M>(
   M: P.Bifunctor<HKT.UHKT2<M>>
): <I, A>(
   id: string,
   f: () => KleisliDecoderHKT<M, I, E, A>,
   onError: (id: string, e: E) => E
) => KleisliDecoderHKT<M, I, E, A> {
   return <I, A>(
      id: string,
      f: () => KleisliDecoderHKT<M, I, E, A>,
      onError: (id: string, e: E) => E
   ): KleisliDecoderHKT<M, I, E, A> => {
      const get = memoize<void, KleisliDecoderHKT<M, I, E, A>>(f);
      return {
         decode: (i) => M.mapLeft_(get().decode(i), (e: E) => onError(id, e))
      };
   };
}

export function lazy<M extends HKT.URIS, C>(
   M: P.Bifunctor<M, C>
): <E>(
   onError: (id: string, e: E) => E
) => <I, A>(
   id: string,
   f: () => KleisliDecoder<M, C & HKT.Fix<"E", E>, I, E, A>
) => KleisliDecoder<M, C & HKT.Fix<"E", E>, I, E, A>;
export function lazy<E, M>(
   M: P.Bifunctor<HKT.UHKT2<M>>
): (
   onError: (id: string, e: E) => E
) => <I, A>(id: string, f: () => KleisliDecoderHKT<M, I, E, A>) => KleisliDecoderHKT<M, I, E, A> {
   return (onError) => (id, f) => lazy_(M)(id, f, onError);
}

export const id = <E, M extends HKT.URIS, C>(M: P.Applicative<M, C & HKT.Fix<"E", E>>) => <A>(): KleisliDecoder<
   M,
   C,
   A,
   E,
   A
> => ({
   decode: pureF(M)
});

export const map_ = <E, F extends HKT.URIS, C>(F: P.Functor<F, C & HKT.Fix<"E", E>>) => <I, A, B>(
   ia: KleisliDecoder<F, C, I, E, A>,
   f: (a: A) => B
): KleisliDecoder<F, C, I, E, B> => ({
   decode: (i) => F.map_(ia.decode(i), f)
});

export const map = <E, F extends HKT.URIS, C>(F: P.Functor<F, C & HKT.Fix<"E", E>>) => <A, B>(f: (a: A) => B) => <I>(
   ia: KleisliDecoder<F, C, I, E, A>
): KleisliDecoder<F, C, I, E, B> => map_(F)(ia, f);

export function alt_<E, F extends HKT.URIS, C>(
   A: P.Alt<F, C & HKT.Fix<"E", E>>
): <I, A>(
   me: KleisliDecoder<F, C, I, E, A>,
   that: () => KleisliDecoder<F, C, I, E, A>
) => KleisliDecoder<F, C, I, E, A>;
export function alt_<E, F>(
   A: P.Alt<HKT.UHKT2<F>, HKT.Fix<"E", E>>
): <I, A>(
   me: KleisliDecoderHKT<F, I, E, A>,
   that: () => KleisliDecoderHKT<F, I, E, A>
) => KleisliDecoderHKT<F, I, E, A> {
   return (me, that) => ({
      decode: (i) => A.alt_(me.decode(i), () => that().decode(i))
   });
}

export function alt<E, F extends HKT.URIS, C>(
   A: P.Alt<F, C & HKT.Fix<"E", E>>
): <I, A>(
   that: () => KleisliDecoder<F, C, I, E, A>
) => (me: KleisliDecoder<F, C, I, E, A>) => KleisliDecoder<F, C, I, E, A>;
export function alt<E, F>(
   A: P.Alt<HKT.UHKT2<F>, HKT.Fix<"E", E>>
): <I, A>(
   that: () => KleisliDecoderHKT<F, I, E, A>
) => (me: KleisliDecoderHKT<F, I, E, A>) => KleisliDecoderHKT<F, I, E, A> {
   return (that) => (me) => alt_(A)(me, that);
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
