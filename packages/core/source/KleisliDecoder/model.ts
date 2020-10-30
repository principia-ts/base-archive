import type * as HKT from "@principia/prelude/HKT";

export interface KleisliDecoder<F extends HKT.URIS, C, I, E, O> {
   readonly decode: (
      i: I
   ) => HKT.Kind<
      F,
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

export type InputOf<M extends HKT.URIS, KD> = [KD] extends [KleisliDecoder<M, any, infer I, any, any>] ? I : never;

export type TypeOf<M extends HKT.URIS, KD> = [KD] extends [KleisliDecoder<M, any, any, any, infer A>] ? A : never;

export type InputOf2<M, KD> = KD extends KleisliDecoderHKT<M, infer I, any, any> ? I : never;

export type TypeOf2<M, KD> = KD extends KleisliDecoderHKT<M, any, any, infer A> ? A : never;

export interface KleisliDecoderHKT<F, I0, E, A> {
   readonly decode: (i: I0) => HKT.HKT2<F, E, A>;
}
