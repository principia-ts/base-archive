import { identity } from "../../Function";
import * as L from "./core";

/*
 * -------------------------------------------
 * Monad Layer
 * -------------------------------------------
 */

export function chain_<R, E, A, R1, E1, B>(
  ma: L.Layer<R, E, A>,
  f: (a: A) => L.Layer<R1, E1, B>
): L.Layer<R & R1, E | E1, B> {
  return new L.LayerChainInstruction(ma, f);
}

export function chain<A, R1, E1, B>(
  f: (a: A) => L.Layer<R1, E1, B>
): <R, E>(ma: L.Layer<R, E, A>) => L.Layer<R & R1, E1 | E, B> {
  return (ma) => chain_(ma, f);
}

export function flatten<R, E, R1, E1, A>(
  mma: L.Layer<R, E, L.Layer<R1, E1, A>>
): L.Layer<R & R1, E | E1, A> {
  return chain_(mma, identity);
}
