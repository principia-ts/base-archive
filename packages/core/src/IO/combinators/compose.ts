import { chain_, giveAll_ } from "../_core";
import type { IO } from "../model";

export function compose_<R, E, A, Q, D>(me: IO<R, E, A>, that: IO<Q, D, R>): IO<Q, D | E, A> {
  return chain_(that, (r) => giveAll_(me, r));
}

export function compose<R, Q, D>(that: IO<Q, D, R>): <E, A>(me: IO<R, E, A>) => IO<Q, D | E, A> {
  return (me) => compose_(me, that);
}
