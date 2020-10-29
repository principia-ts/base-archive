import type { Monoid } from "@principia/prelude/Monoid";
import type { Ord } from "@principia/prelude/Ord";

import * as A from "../Array";
import { toArray } from "./destructors";

/*
 * -------------------------------------------
 * Foldable Set
 * -------------------------------------------
 */

export const reduce_ = <A>(O: Ord<A>) => {
   const toArrayO = toArray(O);
   return <B>(set: ReadonlySet<A>, b: B, f: (b: B, a: A) => B): B => A.reduce_(toArrayO(set), b, f);
};

export const reduce = <A>(O: Ord<A>) => <B>(b: B, f: (b: B, a: A) => B) => (set: ReadonlySet<A>) =>
   reduce_(O)(set, b, f);

export const foldMap_ = <A, M>(O: Ord<A>, M: Monoid<M>) => {
   const toArrayO = toArray(O);
   return (fa: ReadonlySet<A>, f: (a: A) => M) => A.reduce_(toArrayO(fa), M.nat, (b, a) => M.combine_(b, f(a)));
};

export const foldMap = <A, M>(O: Ord<A>, M: Monoid<M>) => {
   const foldMapOM_ = foldMap_(O, M);
   return (f: (a: A) => M) => (fa: ReadonlySet<A>) => foldMapOM_(fa, f);
};
