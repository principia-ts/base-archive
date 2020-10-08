import type { Lazy } from "../Function";
import type { List } from "./List";

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export const nil: List<never> = {
   _tag: "Nil"
};

export const cons_ = <A>(head: Lazy<A>, tail: Lazy<List<A>>): List<A> => ({
   _tag: "Cons",
   head,
   tail
});

export const cons = <A>(head: Lazy<A>) => (tail: Lazy<List<A>>): List<A> => cons_(head, tail);

export const list = <A>(...xs: ReadonlyArray<A>): List<A> =>
   xs.length === 0
      ? nil
      : cons_(
           () => xs[0],
           () => list(...xs.slice(1))
        );

export const fromArray = <A>(xs: ReadonlyArray<A>): List<A> => list(...xs);
