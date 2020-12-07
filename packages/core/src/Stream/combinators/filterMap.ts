import * as C from "../../Chunk";
import * as O from "../../Option";
import { mapChunks_ } from "../functor";
import type { Stream } from "../model";

export function filterMap_<R, E, O, O1>(
  stream: Stream<R, E, O>,
  pf: (o: O) => O.Option<O1>
): Stream<R, E, O1> {
  return mapChunks_(stream, C.filterMap(pf));
}

export function filterMap<O, O1>(
  pf: (o: O) => O.Option<O1>
): <R, E>(stream: Stream<R, E, O>) => Stream<R, E, O1> {
  return (stream) => filterMap_(stream, pf);
}
