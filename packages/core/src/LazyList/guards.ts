import type { Cons, LazyList, Nil } from "./model";

/*
 * -------------------------------------------
 * Typeguards
 * -------------------------------------------
 */

export const isEmpty = <A>(xs: LazyList<A>): xs is Nil => xs._tag === "Nil";

export const isNonEmpty = <A>(xs: LazyList<A>): xs is Cons<A> => xs._tag === "Cons";
