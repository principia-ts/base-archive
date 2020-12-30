import type * as Ex from '../../Exit'

import { pipe } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import * as I from '../../IO'
import * as XR from '../../IORef'
import * as M from '../../Managed'
import * as BPull from '../BufferedPull'
import { Stream } from '../core'
import * as Pull from '../Pull'

/**
 * Unwraps `Exit` values that also signify end-of-stream by failing with `None`.
 */
export function flattenExitOption<R, E, E1, O>(stream: Stream<R, E, Ex.Exit<O.Option<E1>, O>>): Stream<R, E | E1, O> {
  return new Stream(
    pipe(
      M.do,
      M.bindS('upstream', () => M.mapM_(stream.proc, BPull.make)),
      M.bindS('done', () => XR.makeManaged(false)),
      M.map(({ upstream, done }) =>
        I.flatMap_(done.get, (b) =>
          b
            ? Pull.end
            : I.foldM_(
              BPull.pullElement(upstream),
              O.fold(
                () => I.apSecond_(done.set(true), Pull.end),
                (e) => Pull.fail(e as E | E1)
              ),
              (ex) =>
                pipe(
                  I.done(ex),
                  I.foldM(
                    O.fold(() => I.apSecond_(done.set(true), Pull.end), Pull.fail),
                    Pull.emit
                  )
                )
            )
        )
      )
    )
  )
}
