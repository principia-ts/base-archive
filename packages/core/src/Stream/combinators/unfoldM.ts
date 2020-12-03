import { flow } from "../../Function";
import * as I from "../../IO";
import type { Option } from "../../Option";
import * as O from "../../Option";
import type { Stream } from "../model";
import { unfoldChunkM } from "./unfoldChunkM";

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldM<R, E, O, Z>(
  z: Z,
  f: (z: Z) => I.IO<R, E, Option<readonly [O, Z]>>
): Stream<R, E, O> {
  return unfoldChunkM(z)(flow(f, I.map(O.map(([o, z]) => [[o], z]))));
}
