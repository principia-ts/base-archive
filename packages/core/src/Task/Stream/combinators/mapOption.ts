import * as A from "../../../Array";
import * as L from "../../../List";
import * as O from "../../../Option";
import { mapChunks_ } from "../functor";
import type { Stream } from "../model";

export function mapOption_<R, E, O, O1>(stream: Stream<R, E, O>, pf: (o: O) => O.Option<O1>): Stream<R, E, O1> {
   return mapChunks_(stream, L.mapOption(pf));
}

export function mapOption<O, O1>(pf: (o: O) => O.Option<O1>): <R, E>(stream: Stream<R, E, O>) => Stream<R, E, O1> {
   return (stream) => mapOption_(stream, pf);
}
