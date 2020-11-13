import type { Managed } from "../model";
import { chain_ } from "../monad";
import { unit } from "../unit";
import { asUnit } from "./as";
import { suspend } from "./suspend";

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

export function when_<R, E, A>(ma: Managed<R, E, A>, b: boolean): Managed<R, E, void> {
   return suspend(() => (b ? asUnit(ma) : unit()));
}

export function when(b: boolean): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, void> {
   return (ma) => when_(ma, b);
}
