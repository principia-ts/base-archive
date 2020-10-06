import { Eq } from "./Eq";

export const fromEquals = <A>(equals: (x: A) => (y: A) => boolean): Eq<A> => ({
   equals: (x) => (y) => x === y || equals(x)(y)
});

export const eqAny: Eq<any> = {
   equals: () => () => true
};

export const eqStrict: Eq<unknown> = {
   equals: (x) => (y) => x === y
};

export const eqString: Eq<string> = eqStrict;

export const eqNumber: Eq<number> = eqStrict;

export const eqBoolean: Eq<boolean> = eqStrict;

export const eqDate: Eq<Date> = {
   equals: (x) => (y) => x.valueOf() === y.valueOf()
};

export function getStructEq<O extends Readonly<Record<string, any>>>(eqs: { [K in keyof O]: Eq<O[K]> }): Eq<O> {
   return fromEquals((x) => (y) => {
      for (const k in eqs) {
         if (!eqs[k].equals(x[k])(y[k])) {
            return false;
         }
      }
      return true;
   });
}

export function getTupleEq<T extends ReadonlyArray<Eq<any>>>(
   ...eqs: T
): Eq<{ [K in keyof T]: T[K] extends Eq<infer A> ? A : never }> {
   return fromEquals((x) => (y) => eqs.every((E, i) => E.equals(x[i])(y[i])));
}
