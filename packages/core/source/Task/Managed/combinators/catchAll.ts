import type { Cause } from "../../Exit/Cause";
import { succeed } from "../constructors";
import { foldCauseM_, foldM_ } from "../fold";
import type { Managed } from "../model";

export const catchAll_ = <R, E, A, R1, E1, B>(
   ma: Managed<R, E, A>,
   f: (e: E) => Managed<R1, E1, B>
): Managed<R & R1, E1, A | B> => foldM_(ma, f, succeed);

export const catchAll = <E, R1, E1, B>(f: (e: E) => Managed<R1, E1, B>) => <R, A>(
   ma: Managed<R, E, A>
): Managed<R & R1, E1, A | B> => catchAll_(ma, f);

export const catchAllCause_ = <R, E, A, R1, E1, B>(
   ma: Managed<R, E, A>,
   f: (e: Cause<E>) => Managed<R1, E1, B>
): Managed<R & R1, E1, A | B> => foldCauseM_(ma, f, succeed);

export const catchAllCause = <E, R1, E1, B>(f: (e: Cause<E>) => Managed<R1, E1, B>) => <R, A>(
   ma: Managed<R, E, A>
): Managed<R & R1, E1, A | B> => catchAllCause_(ma, f);
