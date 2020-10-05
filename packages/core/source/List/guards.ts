import type { Cons, List, Nil } from "./List";

/*
 * -------------------------------------------
 * Typeguards
 * -------------------------------------------
 */

export const isEmpty = <A>(xs: List<A>): xs is Nil => xs._tag === "Nil";

export const isNonEmpty = <A>(xs: List<A>): xs is Cons<A> => xs._tag === "Cons";
