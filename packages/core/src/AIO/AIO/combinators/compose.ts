import { chain_, giveAll_ } from "../_core";
import type { AIO } from "../model";

export function compose_<R, E, A, Q, D>(me: AIO<R, E, A>, that: AIO<Q, D, R>): AIO<Q, D | E, A> {
  return chain_(that, (r) => giveAll_(me, r));
}

export function compose<R, Q, D>(that: AIO<Q, D, R>): <E, A>(me: AIO<R, E, A>) => AIO<Q, D | E, A> {
  return (me) => compose_(me, that);
}
