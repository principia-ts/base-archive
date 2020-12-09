import type { Managed } from "../model";
import { chain_ } from "../monad";
import { unit } from "../unit";
import { asUnit } from "./as";

export function whenM_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  mb: Managed<R1, E1, boolean>
): Managed<R & R1, E | E1, void> {
  return chain_(mb, (b) => (b ? asUnit(ma) : unit()));
}

export function whenM<R1, E1>(
  mb: Managed<R1, E1, boolean>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, void> {
  return (ma) => whenM_(ma, mb);
}
