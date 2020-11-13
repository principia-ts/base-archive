import { tuple } from "../../Function";
import { mapBothCause_ } from "./apply";
import * as C from "./Cause";
import { succeed } from "./constructors";
import type { Exit } from "./model";

/*
 * -------------------------------------------
 * Applicative Exit
 * -------------------------------------------
 */

export function both_<E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, readonly [A, B]> {
   return mapBothCause_(fa, fb, tuple, C.then);
}

export function both<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, readonly [A, B]> {
   return (fa) => both_(fa, fb);
}

export const pure: <A>(a: A) => Exit<never, A> = succeed;

export function bothPar_<E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, readonly [A, B]> {
   return mapBothCause_(fa, fb, tuple, C.both);
}

export function bothPar<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, readonly [A, B]> {
   return (fa) => bothPar_(fa, fb);
}
