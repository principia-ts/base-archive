import { succeed } from "../constructors";
import { foldM_ } from "../fold";
import type { Managed } from "../model";

export const orElse_ = <R, E, A, R1, E1, B>(
   ma: Managed<R, E, A>,
   that: () => Managed<R1, E1, B>
): Managed<R & R1, E | E1, A | B> => foldM_(ma, () => that(), succeed);

export const orElse = <R1, E1, B>(that: () => Managed<R1, E1, B>) => <R, E, A>(
   ma: Managed<R, E, A>
): Managed<R & R1, E | E1, A | B> => orElse_(ma, that);
