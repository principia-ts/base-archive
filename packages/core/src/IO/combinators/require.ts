import * as O from "../../Option";
import type { IO } from "../_core";
import { chain_, fail, succeed, total } from "../_core";

export function require_<R, E, A>(ma: IO<R, E, O.Option<A>>, error: () => E): IO<R, E, A> {
  return chain_(
    ma,
    O.fold(() => chain_(total(error), fail), succeed)
  );
}

function _require<E>(error: () => E): <R, A>(ma: IO<R, E, O.Option<A>>) => IO<R, E, A> {
  return (ma) => require_(ma, error);
}

export { _require as require };
