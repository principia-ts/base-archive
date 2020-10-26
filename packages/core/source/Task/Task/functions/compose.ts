import { chain_, giveAll_ } from "../core";
import type { Task } from "../model";

export const compose_ = <R, E, A, Q, D>(me: Task<R, E, A>, that: Task<Q, D, R>): Task<Q, D | E, A> =>
   chain_(that, (r) => giveAll_(me, r));

export const compose = <R, Q, D>(that: Task<Q, D, R>) => <E, A>(me: Task<R, E, A>): Task<Q, D | E, A> =>
   compose_(me, that);
