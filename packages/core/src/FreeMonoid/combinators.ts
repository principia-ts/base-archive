import { combine, element } from "./constructors";
import type { FreeMonoid } from "./model";

export function append_<A>(fs: FreeMonoid<A>, a: A): FreeMonoid<A> {
  return combine(fs, element(a));
}

export function append<A>(a: A): (fs: FreeMonoid<A>) => FreeMonoid<A> {
  return (fs) => append_(fs, a);
}

export function prepend_<A>(fs: FreeMonoid<A>, a: A): FreeMonoid<A> {
  return combine(element(a), fs);
}

export function prepend<A>(a: A): (fs: FreeMonoid<A>) => FreeMonoid<A> {
  return (fs) => prepend_(fs, a);
}
