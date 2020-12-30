import type { Chunk } from '../../Chunk'
import type { URef } from '../../IORef'
import type { Option } from '@principia/base/data/Option'

import { pipe } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import * as C from '../../Cause'
import * as I from '../../IO'
import * as XR from '../../IORef'
import * as M from '../../Managed'
import { Stream } from '../core'
import * as Pull from '../Pull'

function go<R, E, A>(
  streams: Chunk<Stream<R, E, A>>,
  chunkSize: number,
  currIndex: URef<number>,
  currStream: URef<I.IO<R, Option<E>, Chunk<A>>>,
  switchStream: (x: M.Managed<R, never, I.IO<R, Option<E>, Chunk<A>>>) => I.IO<R, never, I.IO<R, Option<E>, Chunk<A>>>
): I.IO<R, Option<E>, Chunk<A>> {
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
            I.flatMap((i) =>
              i >= chunkSize
                ? Pull.end
                : pipe(
                  switchStream(streams[i].proc),
                  I.flatMap(currStream.set),
                  I.apSecond(go(streams, chunkSize, currIndex, currStream, switchStream))
                )
            )
          ),
        Pull.halt
      )
    )
  )
}

/**
 * Concatenates all of the streams in the chunk to one stream.
 */
export function concatAll<R, E, A>(streams: Chunk<Stream<R, E, A>>): Stream<R, E, A> {
  const chunkSize = streams.length
  return new Stream(
    pipe(
      M.do,
      M.bindS('currIndex', () => XR.makeManaged(0)),
      M.bindS('currStream', () => XR.makeManaged<I.IO<R, Option<E>, Chunk<A>>>(Pull.end)),
      M.bindS('switchStream', () => M.switchable<R, never, I.IO<R, Option<E>, Chunk<A>>>()),
      M.map(({ currIndex, currStream, switchStream }) => go(streams, chunkSize, currIndex, currStream, switchStream))
    )
  )
}
