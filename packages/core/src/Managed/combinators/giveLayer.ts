import type { Layer } from "../../Layer";
import { build } from "../../Layer";
import type { Managed } from "../_core";
import { chain_ } from "../monad";
import { gives_ } from "../reader";

export function giveLayer_<R, E, A, R1, E1, A1>(
  ma: Managed<R & A1, E, A>,
  layer: Layer<R1, E1, A1>
): Managed<R & R1, E | E1, A> {
  return chain_(build(layer), (p) => gives_(ma, (r: R & R1) => ({ ...r, ...p })));
}

export function giveLayer<R1, E1, A1>(layer: Layer<R1, E1, A1>) {
  return <R, E, A>(ma: Managed<R & A1, E, A>): Managed<R & R1, E | E1, A> =>
    chain_(build(layer), (p) => gives_(ma, (r: R & R1) => ({ ...r, ...p })));
}
