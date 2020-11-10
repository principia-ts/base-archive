import { combine, element } from "./constructors";
import type { FreeMonoid } from "./model";

export const append_ = <A>(fs: FreeMonoid<A>, a: A): FreeMonoid<A> => combine(fs, element(a));

export const append = <A>(a: A) => (fs: FreeMonoid<A>): FreeMonoid<A> => append_(fs, a);

export const prepend_ = <A>(fs: FreeMonoid<A>, a: A): FreeMonoid<A> => combine(element(a), fs);

export const prepend = <A>(a: A) => (fs: FreeMonoid<A>): FreeMonoid<A> => prepend_(fs, a);
