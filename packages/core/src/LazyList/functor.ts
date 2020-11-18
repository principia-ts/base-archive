import { head, tail } from "./combinators";
import { cons_, nil } from "./constructors";
import { isEmpty } from "./guards";
import type { LazyList } from "./model";

/*
 * -------------------------------------------
 * Functor LazyList
 * -------------------------------------------
 */

export const map_ = <A, B>(xs: LazyList<A>, f: (a: A) => B): LazyList<B> =>
  isEmpty(xs)
    ? nil
    : cons_(
        () => f(head(xs)),
        () => map_(tail(xs), f)
      );

export const map = <A, B>(f: (a: A) => B) => (fa: LazyList<A>): LazyList<B> => map_(fa, f);
