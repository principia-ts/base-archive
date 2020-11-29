import { fail } from "../_core";
import type { AIO } from "../model";
import { orElse_ } from "./orElse";

export function orElseFail_<R, E, A, E1>(ma: AIO<R, E, A>, e: E1): AIO<R, E1, A> {
  return orElse_(ma, () => fail(e));
}

export function orElseFail<E1>(e: E1): <R, E, A>(fa: AIO<R, E, A>) => AIO<R, E1, A> {
  return (fa) => orElseFail_(fa, e);
}
