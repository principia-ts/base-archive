import type { Eq } from "../Eq";
import { every } from "./combinators";
import { elem } from "./methods";

/**
 * `true` if and only if every element in the first set is an element of the second set
 *
 * @since 1.0.0
 */
export const isSubset = <A>(E: Eq<A>): ((that: ReadonlySet<A>) => (me: ReadonlySet<A>) => boolean) => {
   const elemE = elem(E);
   return (that) => every((a: A) => elemE(a)(that));
};
