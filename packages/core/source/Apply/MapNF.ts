import type * as HKT from "../HKT";
import type { Mutable } from "../Utils";
import { Apply } from "./Apply";
import { sequenceT } from "./SequenceT";

export interface MapNF<F extends HKT.URIS, C = HKT.Auto> {
   <
      KT extends readonly [
         HKT.Kind<F, C, string, any, any, any, any, any, any, any, any, any>,
         ...HKT.Kind<F, C, string, any, any, any, any, any, any, any, any, any>[]
      ],
      B
   >(
      f: (as: readonly [...{ [K in keyof KT]: HKT.Infer<F, "A", KT[K]> }]) => B
   ): (
      fas: readonly [...KT]
   ) => HKT.Kind<
      F,
      C,
      string,
      HKT.Mix<C, "K", Mutable<{ [K in keyof KT]: HKT.Infer<F, "K", KT[K]> }>>,
      HKT.Mix<C, "Q", Mutable<{ [K in keyof KT]: HKT.Infer<F, "Q", KT[K]> }>>,
      HKT.Mix<C, "W", Mutable<{ [K in keyof KT]: HKT.Infer<F, "W", KT[K]> }>>,
      HKT.Mix<C, "X", Mutable<{ [K in keyof KT]: HKT.Infer<F, "X", KT[K]> }>>,
      HKT.Mix<C, "I", Mutable<{ [K in keyof KT]: HKT.Infer<F, "I", KT[K]> }>>,
      HKT.Mix<C, "S", Mutable<{ [K in keyof KT]: HKT.Infer<F, "S", KT[K]> }>>,
      HKT.Mix<C, "R", Mutable<{ [K in keyof KT]: HKT.Infer<F, "R", KT[K]> }>>,
      HKT.Mix<C, "E", Mutable<{ [K in keyof KT]: HKT.Infer<F, "E", KT[K]> }>>,
      B
   >;
}

export function deriveMapN<F extends HKT.URIS, C = HKT.Auto>(A: Apply<F, C>): MapNF<F, C>;
export function deriveMapN<F>(A: Apply<HKT.UHKT<F>>): MapNF<HKT.UHKT<F>> {
   return (f) => (fas) => A._map(sequenceT(A)(...(fas as any)), (as) => f(as as any));
}
