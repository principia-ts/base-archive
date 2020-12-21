import type { Layer } from "../../Layer";
import type { Managed } from "../core";

import * as L from "../../Layer";
import { giveLayer } from "./giveLayer";

export function giveSomeLayer<R1, E1, A1>(layer: Layer<R1, E1, A1>) {
  return <R, E, A>(ma: Managed<R & A1, E, A>) => giveLayer(layer["+++"](L.identity<R>()))(ma);
}

export function giveSomeLayer_<R, E, A, R1, E1, A1>(
  ma: Managed<R & A1, E, A>,
  layer: Layer<R1, E1, A1>
): Managed<R & R1, E | E1, A> {
  return giveSomeLayer(layer)(ma);
}
