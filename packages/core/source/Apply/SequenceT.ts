import { pipe } from "../Function";
import type * as HKT from "../HKT";
import type { Apply } from "./Apply";
import { getTupleConstructor } from "./utils";

export function sequenceT<F extends HKT.URIS, C = HKT.Auto>(F: Apply<F, C>) {
   return <
      KT extends [
         HKT.Kind<F, C, string, any, any, any, any, any, any, any, any, any>,
         ...HKT.Kind<F, C, string, any, any, any, any, any, any, any, any, any>[]
      ]
   >(
      ...t: KT
   ): SequencedT<KT, F, C> => {
      const len = t.length;
      const f = getTupleConstructor(len);
      let fas = pipe(t[0], F.map(f));
      for (let i = 1; i < len; i++) {
         fas = pipe(fas, F.ap(t[i])) as any;
      }
      return fas as any;
   };
}

type SequencedT<
   KT extends [
      HKT.Kind<F, C, string, any, any, any, any, any, any, any, any, any>,
      ...HKT.Kind<F, C, string, any, any, any, any, any, any, any, any, any>[]
   ],
   F extends HKT.URIS,
   C = HKT.Auto
> = HKT.Kind<
   F,
   C,
   string,
   HKT.Mix<C, "K", { [K in keyof KT]: HKT.Infer<F, "K", KT[K]> }>,
   HKT.Mix<C, "Q", { [K in keyof KT]: HKT.Infer<F, "Q", KT[K]> }>,
   HKT.Mix<C, "W", { [K in keyof KT]: HKT.Infer<F, "W", KT[K]> }>,
   HKT.Mix<C, "X", { [K in keyof KT]: HKT.Infer<F, "X", KT[K]> }>,
   HKT.Mix<C, "I", { [K in keyof KT]: HKT.Infer<F, "I", KT[K]> }>,
   HKT.Mix<C, "S", { [K in keyof KT]: HKT.Infer<F, "S", KT[K]> }>,
   HKT.Mix<C, "R", { [K in keyof KT]: HKT.Infer<F, "R", KT[K]> }>,
   HKT.Mix<C, "E", { [K in keyof KT]: HKT.Infer<F, "E", KT[K]> }>,
   {
      [K in keyof KT]: HKT.Infer<F, "A", KT[K]>;
   }
>;
