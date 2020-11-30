import { fail } from "../constructors";
import type { Managed } from "../model";
import { orElse_ } from "./orElse";

export function orElseFail_<R, E, A, E1>(ma: Managed<R, E, A>, e: E1): Managed<R, E | E1, A> {
  return orElse_(ma, () => fail(e));
}

export function orElseFail<E1>(e: E1): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E1 | E, A> {
  return (ma) => orElseFail_(ma, e);
}
