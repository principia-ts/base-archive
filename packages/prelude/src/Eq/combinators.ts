import { fromEquals } from "./constructors";
import type { Eq } from "./model";

export function getStructEq<O extends Readonly<Record<string, any>>>(
  eqs: { [K in keyof O]: Eq<O[K]> }
): Eq<O> {
  return fromEquals((x, y) => {
    for (const k in eqs) {
      if (!eqs[k].equals_(x[k], y[k])) {
        return false;
      }
    }
    return true;
  });
}

export function getTupleEq<T extends ReadonlyArray<Eq<any>>>(
  ...eqs: T
): Eq<{ [K in keyof T]: T[K] extends Eq<infer A> ? A : never }> {
  return fromEquals((x, y) => eqs.every((E, i) => E.equals_(x[i], y[i])));
}
