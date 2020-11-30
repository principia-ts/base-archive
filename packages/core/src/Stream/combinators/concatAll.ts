import { pipe } from "../../Function";
import * as I from "../../IO";
import * as C from "../../IO/Cause";
import type { URef } from "../../IORef";
import * as XR from "../../IORef";
import * as M from "../../Managed";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { Stream } from "../model";
import * as Pull from "../Pull";

function go<R, E, A>(
  streams: ReadonlyArray<Stream<R, E, A>>,
  chunkSize: number,
  currIndex: URef<number>,
  currStream: URef<I.IO<R, Option<E>, ReadonlyArray<A>>>,
  switchStream: (
    x: M.Managed<R, never, I.IO<R, Option<E>, ReadonlyArray<A>>>
  ) => I.IO<R, never, I.IO<R, Option<E>, ReadonlyArray<A>>>
): I.IO<R, Option<E>, ReadonlyArray<A>> {
  return pipe(
    currStream.get,
    I.flatten,
    I.catchAllCause((x) =>
      O.fold_(
        C.sequenceCauseOption(x),
        () =>
          pipe(
            currIndex,
            XR.getAndUpdate((x) => x + 1),
            I.chain((i) =>
              i >= chunkSize
                ? Pull.end
                : pipe(
                    switchStream(streams[i].proc),
                    I.chain(currStream.set),
                    I.apSecond(go(streams, chunkSize, currIndex, currStream, switchStream))
                  )
            )
          ),
        Pull.halt
      )
    )
  );
}

/**
 * Concatenates all of the streams in the chunk to one stream.
 */
export function concatAll<R, E, A>(streams: ReadonlyArray<Stream<R, E, A>>): Stream<R, E, A> {
  const chunkSize = streams.length;
  return new Stream(
    pipe(
      M.do,
      M.bindS("currIndex", () => XR.makeManaged(0)),
      M.bindS("currStream", () => XR.makeManaged<I.IO<R, Option<E>, ReadonlyArray<A>>>(Pull.end)),
      M.bindS("switchStream", () => M.switchable<R, never, I.IO<R, Option<E>, ReadonlyArray<A>>>()),
      M.map(({ currIndex, currStream, switchStream }) =>
        go(streams, chunkSize, currIndex, currStream, switchStream)
      )
    )
  );
}
