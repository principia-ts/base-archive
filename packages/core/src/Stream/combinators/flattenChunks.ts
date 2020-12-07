import { pipe } from "@principia/prelude";

import type { Chunk } from "../../Chunk";
import * as M from "../../Managed";
import * as BPull from "../BufferedPull";
import { Stream } from "../model";

/**
 * Submerges the chunks carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenChunks<R, E, O>(stream: Stream<R, E, Chunk<O>>): Stream<R, E, O> {
  return new Stream(pipe(stream.proc, M.mapM(BPull.make), M.map(BPull.pullElement)));
}
