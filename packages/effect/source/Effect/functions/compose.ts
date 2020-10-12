import { chain_, giveAll_ } from "../core";
import type { Effect } from "../Effect";

export const compose_ = <R, E, A, Q, D>(me: Effect<R, E, A>, that: Effect<Q, D, R>): Effect<Q, D | E, A> =>
   chain_(that, (r) => giveAll_(me, r));

export const compose = <R, Q, D>(that: Effect<Q, D, R>) => <E, A>(me: Effect<R, E, A>): Effect<Q, D | E, A> =>
   compose_(me, that);
