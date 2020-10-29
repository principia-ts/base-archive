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

export const both_ = <E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, readonly [A, B]> =>
   mapBothCause_(fa, fb, tuple, C.then);

export const both = <G, B>(fb: Exit<G, B>) => <E, A>(fa: Exit<E, A>): Exit<E | G, readonly [A, B]> => both_(fa, fb);

export const pure: <A>(a: A) => Exit<never, A> = succeed;

export const bothPar_ = <E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, readonly [A, B]> =>
   mapBothCause_(fa, fb, tuple, C.both);

export const bothPar = <G, B>(fb: Exit<G, B>) => <E, A>(fa: Exit<E, A>): Exit<E | G, readonly [A, B]> =>
   bothPar_(fa, fb);
