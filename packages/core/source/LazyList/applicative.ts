import { list } from "./constructors";
import type { LazyList } from "./model";

/*
 * -------------------------------------------
 * Applicative LazyList
 * -------------------------------------------
 */

export const pure: <A>(a: A) => LazyList<A> = list;
