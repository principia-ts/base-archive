import type { Task } from "../_core";
import { chain_, fail, succeed, total } from "../_core";
import * as O from "../../../Option";

export function require_<R, E, A>(ma: Task<R, E, O.Option<A>>, error: () => E): Task<R, E, A> {
   return chain_(
      ma,
      O.fold(() => chain_(total(error), fail), succeed)
   );
}

function _require<E>(error: () => E): <R, A>(ma: Task<R, E, O.Option<A>>) => Task<R, E, A> {
   return (ma) => require_(ma, error);
}

export { _require as require };
