import { pipe } from "../Function";
import type * as HKT from "../HKT";
import type { Apply } from "./Apply";
import type { InferMixTuple } from "./utils";
import { getTupleConstructor } from "./utils";

export interface SequenceTFn<F extends HKT.URIS, TC = HKT.Auto> {
   <
      KT extends readonly [
         HKT.Kind<
            F,
            TC,
            HKT.Intro<TC, "N", N, any>,
            HKT.Intro<TC, "K", K, any>,
            HKT.Intro<TC, "Q", Q, any>,
            HKT.Intro<TC, "W", W, any>,
            HKT.Intro<TC, "X", X, any>,
            HKT.Intro<TC, "I", I, any>,
            HKT.Intro<TC, "S", S, any>,
            HKT.Intro<TC, "R", R, any>,
            HKT.Intro<TC, "E", E, any>,
            unknown
         >,
         ...ReadonlyArray<
            HKT.Kind<
               F,
               TC,
               HKT.Intro<TC, "N", N, any>,
               HKT.Intro<TC, "K", K, any>,
               HKT.Intro<TC, "Q", Q, any>,
               HKT.Intro<TC, "W", W, any>,
               HKT.Intro<TC, "X", X, any>,
               HKT.Intro<TC, "I", I, any>,
               HKT.Intro<TC, "S", S, any>,
               HKT.Intro<TC, "R", R, any>,
               HKT.Intro<TC, "E", E, any>,
               unknown
            >
         >
      ],
      N extends string = HKT.Initial<TC, "N">,
      K = HKT.Initial<TC, "K">,
      Q = HKT.Initial<TC, "Q">,
      W = HKT.Initial<TC, "W">,
      X = HKT.Initial<TC, "X">,
      I = HKT.Initial<TC, "I">,
      S = HKT.Initial<TC, "S">,
      R = HKT.Initial<TC, "R">,
      E = HKT.Initial<TC, "E">
   >(
      ...t: KT
   ): HKT.Kind<
      F,
      TC,
      InferMixTuple<F, TC, "N", N, KT>,
      InferMixTuple<F, TC, "K", K, KT>,
      InferMixTuple<F, TC, "Q", Q, KT>,
      InferMixTuple<F, TC, "W", W, KT>,
      InferMixTuple<F, TC, "X", X, KT>,
      InferMixTuple<F, TC, "I", I, KT>,
      InferMixTuple<F, TC, "S", S, KT>,
      InferMixTuple<F, TC, "R", R, KT>,
      InferMixTuple<F, TC, "E", E, KT>,
      {
         [K in keyof KT & number]: HKT.Infer<F, "A", KT[K]>;
      }
   >;
}

export function sequenceTF<F extends HKT.URIS, C = HKT.Auto>(F: Apply<F, C>): SequenceTFn<F, C>;
export function sequenceTF<F>(F: Apply<HKT.UHKT<F>>): SequenceTFn<HKT.UHKT<F>> {
   return (...t) => {
      const len = t.length;
      const f = getTupleConstructor(len);
      let fas = pipe(t[0], F.map(f));
      for (let i = 1; i < len; i++) {
         fas = pipe(fas, F.ap(t[i])) as any;
      }
      return fas as any;
   };
}
