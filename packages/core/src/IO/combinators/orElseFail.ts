import { fail } from "../_core";
import type { IO } from "../model";
import { orElse_ } from "./orElse";

export function orElseFail_<R, E, A, E1>(ma: IO<R, E, A>, e: E1): IO<R, E1, A> {
  return orElse_(ma, () => fail(e));
}

export function orElseFail<E1>(e: E1): <R, E, A>(fa: IO<R, E, A>) => IO<R, E1, A> {
  return (fa) => orElseFail_(fa, e);
}
