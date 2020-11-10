import type { Managed } from "../model";
import { chain_ } from "../monad";
import { unit } from "../unit";
import { asUnit } from "./as";
import { suspend } from "./suspend";

export const whenM_ = <R, E, A, R1, E1>(
   ma: Managed<R, E, A>,
   mb: Managed<R1, E1, boolean>
): Managed<R & R1, E | E1, void> => chain_(mb, (b) => (b ? asUnit(ma) : unit()));

export const whenM = <R1, E1>(mb: Managed<R1, E1, boolean>) => <R, E, A>(
   ma: Managed<R, E, A>
): Managed<R & R1, E | E1, void> => whenM_(ma, mb);

export const when_ = <R, E, A>(ma: Managed<R, E, A>, b: boolean): Managed<R, E, void> =>
   suspend(() => (b ? asUnit(ma) : unit()));

export const when = (b: boolean) => <R, E, A>(ma: Managed<R, E, A>): Managed<R, E, void> => when_(ma, b);
