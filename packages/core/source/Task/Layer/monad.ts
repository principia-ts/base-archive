import { identity } from "../../Function";
import * as L from "./core";

/*
 * -------------------------------------------
 * Monad Layer
 * -------------------------------------------
 */

export const chain_ = <R, E, A, R1, E1, B>(
   ma: L.Layer<R, E, A>,
   f: (a: A) => L.Layer<R1, E1, B>
): L.Layer<R & R1, E | E1, B> => new L.LayerChainInstruction(ma, f);

export const chain = <A, R1, E1, B>(f: (a: A) => L.Layer<R1, E1, B>) => <R, E>(
   ma: L.Layer<R, E, A>
): L.Layer<R & R1, E | E1, B> => chain_(ma, f);

export const flatten = <R, E, R1, E1, A>(mma: L.Layer<R, E, L.Layer<R1, E1, A>>): L.Layer<R & R1, E | E1, A> =>
   chain_(mma, identity);