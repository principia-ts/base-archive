import { pure } from "../_core";
import type { AIO } from "../model";
import { orElse_ } from "./orElse";

export function orElseSucceed_<R, E, A, A1>(ma: AIO<R, E, A>, a: A1): AIO<R, E, A | A1> {
  return orElse_(ma, () => pure(a));
}

export function orElseSucceed<A1>(a: A1): <R, E, A>(self: AIO<R, E, A>) => AIO<R, E, A1 | A> {
  return (self) => orElseSucceed_(self, a);
}
