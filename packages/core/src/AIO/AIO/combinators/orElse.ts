import { pure } from "../_core";
import type { AIO } from "../model";
import { tryOrElse_ } from "./tryOrElse";

export function orElse_<R, E, A, R1, E1, A1>(
  ma: AIO<R, E, A>,
  that: () => AIO<R1, E1, A1>
): AIO<R & R1, E1, A | A1> {
  return tryOrElse_(ma, that, pure);
}

export function orElse<R1, E1, A1>(
  that: () => AIO<R1, E1, A1>
): <R, E, A>(ma: AIO<R, E, A>) => AIO<R & R1, E1, A1 | A> {
  return (ma) => tryOrElse_(ma, that, pure);
}
