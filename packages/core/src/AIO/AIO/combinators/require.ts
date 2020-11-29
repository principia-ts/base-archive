import * as O from "../../../Option";
import type { AIO } from "../_core";
import { chain_, fail, succeed, total } from "../_core";

export function require_<R, E, A>(ma: AIO<R, E, O.Option<A>>, error: () => E): AIO<R, E, A> {
  return chain_(
    ma,
    O.fold(() => chain_(total(error), fail), succeed)
  );
}

function _require<E>(error: () => E): <R, A>(ma: AIO<R, E, O.Option<A>>) => AIO<R, E, A> {
  return (ma) => require_(ma, error);
}

export { _require as require };
