import { pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as C from "../../Exit/Cause";
import * as M from "../../Managed";
import * as T from "../../Task";
import type { Ref } from "../../XRef";
import * as XR from "../../XRef";
import * as Pull from "../internal/Pull";
import { Stream } from "../model";

function go<R, E, A>(
  streams: ReadonlyArray<Stream<R, E, A>>,
  chunkSize: number,
  currIndex: Ref<number>,
  currStream: Ref<T.Task<R, Option<E>, ReadonlyArray<A>>>,
  switchStream: (
    x: M.Managed<R, never, T.Task<R, Option<E>, ReadonlyArray<A>>>
  ) => T.Task<R, never, T.Task<R, Option<E>, ReadonlyArray<A>>>
): T.Task<R, Option<E>, ReadonlyArray<A>> {
  return pipe(
    currStream.get,
    T.flatten,
    T.catchAllCause((x) =>
      O.fold_(
        C.sequenceCauseOption(x),
        () =>
          pipe(
            currIndex,
            XR.getAndUpdate((x) => x + 1),
            T.chain((i) =>
              i >= chunkSize
                ? Pull.end
                : pipe(
                    switchStream(streams[i].proc),
                    T.chain(currStream.set),
                    T.apSecond(go(streams, chunkSize, currIndex, currStream, switchStream))
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
      M.bindS("currStream", () => XR.makeManaged<T.Task<R, Option<E>, ReadonlyArray<A>>>(Pull.end)),
      M.bindS("switchStream", () =>
        M.switchable<R, never, T.Task<R, Option<E>, ReadonlyArray<A>>>()
      ),
      M.map(({ currIndex, currStream, switchStream }) =>
        go(streams, chunkSize, currIndex, currStream, switchStream)
      )
    )
  );
}
