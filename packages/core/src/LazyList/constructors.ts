import type { Lazy } from "../Function";
import type { LazyList } from "./model";

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export const nil: LazyList<never> = {
   _tag: "Nil"
};

export const cons_ = <A>(head: Lazy<A>, tail: Lazy<LazyList<A>>): LazyList<A> => ({
   _tag: "Cons",
   head,
   tail
});

export const cons = <A>(head: Lazy<A>) => (tail: Lazy<LazyList<A>>): LazyList<A> => cons_(head, tail);

export const list = <A>(...xs: ReadonlyArray<A>): LazyList<A> =>
   xs.length === 0
      ? nil
      : cons_(
           () => xs[0],
           () => list(...xs.slice(1))
        );

export const fromArray = <A>(xs: ReadonlyArray<A>): LazyList<A> => list(...xs);
