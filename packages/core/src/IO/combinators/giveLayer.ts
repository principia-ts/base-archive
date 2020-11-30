import type { Layer } from "../../Layer";
import { build } from "../../Layer";
import * as M from "../../Managed";
import { gives_ } from "../_core";
import type { IO } from "../model";

/**
 * Provides a layer to the given effect
 */
export function giveLayer_<R, E, A, R1, E1, A1>(
  fa: IO<R & A1, E, A>,
  layer: Layer<R1, E1, A1>
): IO<R & R1, E | E1, A> {
  return M.use_(build(layer), (p) => gives_(fa, (r: R & R1) => ({ ...r, ...p })));
}

/**
 * Provides a layer to the given effect
 */
export function giveLayer<R1, E1, A1>(layer: Layer<R1, E1, A1>) {
  return <R, E, A>(fa: IO<R & A1, E, A>): IO<R & R1, E | E1, A> =>
    M.use_(build(layer), (p) => gives_(fa, (r: R & R1) => ({ ...r, ...p })));
}
