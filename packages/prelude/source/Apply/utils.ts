import { tuple } from "../Function";
import type * as HKT from "../HKT";

/**
 * @internal
 */
export function curried(f: Function, n: number, acc: ReadonlyArray<unknown>) {
   return function (x: unknown) {
      const combined = Array(acc.length + 1);
      for (let i = 0; i < acc.length; i++) {
         combined[i] = acc[i];
      }
      combined[acc.length] = x;
      /* eslint-disable-next-line prefer-spread */
      return n === 0 ? f.apply(null, combined) : curried(f, n - 1, combined);
   };
}
/**
 * @internal
 */
export const tupleConstructors: Record<number, (a: unknown) => any> = {
   1: (a) => [a],
   2: (a) => (b: any) => [a, b],
   3: (a) => (b: any) => (c: any) => [a, b, c],
   4: (a) => (b: any) => (c: any) => (d: any) => [a, b, c, d],
   5: (a) => (b: any) => (c: any) => (d: any) => (e: any) => [a, b, c, d, e]
};

/**
 * @internal
 */
export function getTupleConstructor(len: number): (a: unknown) => any {
   /* eslint-disable-next-line no-prototype-builtins */
   if (!tupleConstructors.hasOwnProperty(len)) {
      tupleConstructors[len] = curried(tuple, len - 1, []);
   }
   return tupleConstructors[len];
}

/**
 * @internal
 */
export function getRecordConstructor(keys: ReadonlyArray<string>) {
   const len = keys.length;
   switch (len) {
      case 1:
         return (a: any) => ({ [keys[0]]: a });
      case 2:
         return (a: any) => (b: any) => ({ [keys[0]]: a, [keys[1]]: b });
      case 3:
         return (a: any) => (b: any) => (c: any) => ({ [keys[0]]: a, [keys[1]]: b, [keys[2]]: c });
      case 4:
         return (a: any) => (b: any) => (c: any) => (d: any) => ({
            [keys[0]]: a,
            [keys[1]]: b,
            [keys[2]]: c,
            [keys[3]]: d
         });
      case 5:
         return (a: any) => (b: any) => (c: any) => (d: any) => (e: any) => ({
            [keys[0]]: a,
            [keys[1]]: b,
            [keys[2]]: c,
            [keys[3]]: d,
            [keys[4]]: e
         });
      default:
         return curried(
            (...args: ReadonlyArray<unknown>) => {
               const r: Record<string, unknown> = {};
               for (let i = 0; i < len; i++) {
                  r[keys[i]] = args[i];
               }
               return r;
            },
            len - 1,
            []
         );
   }
}

/**
 * @internal
 */
export type InferMixStruct<F extends HKT.URIS, TC, P extends HKT.Param, T, KS> = HKT.MixStruct<
   TC,
   P,
   T,
   { [K in keyof KS]: HKT.Infer<F, P, KS[K]> }
>;

/**
 * @internal
 */
export type InferMixTuple<F extends HKT.URIS, TC, P extends HKT.Param, T, KT> = HKT.MixStruct<
   TC,
   P,
   T,
   { [K in keyof KT & number]: HKT.Infer<F, P, KT[K]> }
>;
