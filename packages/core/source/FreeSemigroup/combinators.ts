import { combine, element } from "./constructors";
import type { FreeSemigroup } from "./model";

export const append_ = <A>(fs: FreeSemigroup<A>, a: A): FreeSemigroup<A> => combine(fs, element(a));

export const append = <A>(a: A) => (fs: FreeSemigroup<A>): FreeSemigroup<A> => append_(fs, a);

export const prepend_ = <A>(fs: FreeSemigroup<A>, a: A): FreeSemigroup<A> => combine(element(a), fs);

export const prepend = <A>(a: A) => (fs: FreeSemigroup<A>): FreeSemigroup<A> => prepend_(fs, a);
