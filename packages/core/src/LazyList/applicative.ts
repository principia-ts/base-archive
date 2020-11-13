import { list } from "./constructors";
import type { LazyList } from "./model";

/*
 * -------------------------------------------
 * Applicative LazyList
 * -------------------------------------------
 */

export function pure<A>(a: A): LazyList<A> {
   return list(a);
}
