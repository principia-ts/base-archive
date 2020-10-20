import type * as HKT from "@principia/prelude/HKT";

export interface KleisliDecoder<
   F extends HKT.URIS,
   C extends HKT.Fix<"E", E>,
   I0,
   N extends string,
   K,
   Q,
   W,
   X,
   I,
   S,
   R,
   E,
   A
> {
   readonly decode: (i: I0) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>;
}

export type InputOf<M extends HKT.URIS, KD> = [KD] extends [
   KleisliDecoder<M, any, infer I, any, any, any, any, any, any, any, any, any, any>
]
   ? I
   : never;

export type TypeOf<M extends HKT.URIS, KD> = [KD] extends [
   KleisliDecoder<M, any, any, any, any, any, any, any, any, any, any, any, infer A>
]
   ? A
   : never;

export type InputOf2<M, KD> = KD extends KleisliDecoder2<M, infer I, any, any> ? I : never;

export type TypeOf2<M, KD> = KD extends KleisliDecoder2<M, any, any, infer A> ? A : never;

export type Infer<M extends HKT.URIS, P extends HKT.Param | "A" | "C" | "I0", KD> = [KD] extends [
   KleisliDecoder<
      M,
      infer C,
      infer I0,
      infer N,
      infer K,
      infer Q,
      infer W,
      infer X,
      infer I,
      infer S,
      infer R,
      infer E,
      infer A
   >
]
   ? P extends "C"
      ? C
      : P extends "I0"
      ? I0
      : P extends "N"
      ? N
      : P extends "K"
      ? K
      : P extends "Q"
      ? Q
      : P extends "W"
      ? W
      : P extends "X"
      ? X
      : P extends "I"
      ? I
      : P extends "S"
      ? S
      : P extends "R"
      ? R
      : P extends "E"
      ? E
      : P extends "A"
      ? A
      : never
   : never;

export interface KleisliDecoder2<F, I0, E, A> {
   readonly decode: (i: I0) => HKT.HKT2<F, E, A>;
}
