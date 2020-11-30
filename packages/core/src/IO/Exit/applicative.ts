import { tuple } from "../../Function";
import * as C from "../Cause";
import { zipWithCause_ } from "./apply";
import { succeed } from "./constructors";
import type { Exit } from "./model";

/*
 * -------------------------------------------
 * Applicative Exit
 * -------------------------------------------
 */

export function zip_<E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, readonly [A, B]> {
  return zipWithCause_(fa, fb, tuple, C.then);
}

export function zip<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, readonly [A, B]> {
  return (fa) => zip_(fa, fb);
}

export const pure: <A>(a: A) => Exit<never, A> = succeed;

export function zipPar_<E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, readonly [A, B]> {
  return zipWithCause_(fa, fb, tuple, C.both);
}

export function zipPar<G, B>(
  fb: Exit<G, B>
): <E, A>(fa: Exit<E, A>) => Exit<G | E, readonly [A, B]> {
  return (fa) => zipPar_(fa, fb);
}
