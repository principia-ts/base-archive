import type * as M from "../../Managed/_core";
import type * as Push from "../internal/Push";

// Important notes while writing sinks and combinators:
// - What return values for sinks mean:
//   Task.unit - "need more values"
//   Task.fail([Either.Right(z), l]) - "ended with z and emit leftover l"
//   Task.fail([Either.Left(e), l]) - "failed with e and emit leftover l"
// - Result of processing of the stream using the sink must not depend on how the stream is chunked
//   (chunking-invariance)
//   pipe(stream, run(sink), Task.either) === pipe(stream, chunkN(1), run(sink), Task.either)
// - Sinks should always end when receiving a `None`. It is a defect to not end with some
//   sort of result (even a failure) when receiving a `None`.
// - Sinks can assume they will not be pushed again after emitting a value.
export class Sink<R, E, I, L, Z> {
   constructor(readonly push: M.Managed<R, never, Push.Push<R, E, I, L, Z>>) {}
}
