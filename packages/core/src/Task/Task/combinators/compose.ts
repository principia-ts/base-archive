import { chain_, giveAll_ } from "../_core";
import type { Task } from "../model";

export function compose_<R, E, A, Q, D>(me: Task<R, E, A>, that: Task<Q, D, R>): Task<Q, D | E, A> {
   return chain_(that, (r) => giveAll_(me, r));
}

export function compose<R, Q, D>(that: Task<Q, D, R>): <E, A>(me: Task<R, E, A>) => Task<Q, D | E, A> {
   return (me) => compose_(me, that);
}
