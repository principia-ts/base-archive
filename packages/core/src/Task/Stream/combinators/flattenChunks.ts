import { pipe } from "@principia/prelude";

import * as M from "../../Managed";
import * as BPull from "../internal/BufferedPull";
import { Stream } from "../model";

export function flattenChunks<R, E, O>(stream: Stream<R, E, ReadonlyArray<O>>): Stream<R, E, O> {
   return new Stream(pipe(stream.proc, M.mapM(BPull.make), M.map(BPull.pullElement)));
}
