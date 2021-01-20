import type { ExecutionStrategy } from '../../ExecutionStrategy'
import type { Exit } from '../../Exit'

import { pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'

import * as Ex from '../../Exit'
import { foreachPar as foreachParIO } from '../../IO/combinators/foreachPar'
import { foreachParN as foreachParNIO } from '../../IO/combinators/foreachParN'
import * as XR from '../../IORef'
import * as I from '../internal/io'
import * as RM from '../ReleaseMap'

export function releaseAll(exit: Exit<any, any>, execStrategy: ExecutionStrategy): (_: RM.ReleaseMap) => I.UIO<any> {
  return (_) =>
    pipe(
      _.ref,
      XR.modify((s): [I.UIO<any>, RM.State] => {
        switch (s._tag) {
          case 'Exited': {
            return [I.unit(), s]
          }
          case 'Running': {
            switch (execStrategy._tag) {
              case 'Sequential': {
                return [
                  pipe(
                    Array.from(RM.finalizers(s)).reverse(),
                    I.foreach(([, f]) => I.result(f(exit))),
                    I.flatMap((e) =>
                      pipe(
                        Ex.collectAll(...e),
                        O.getOrElse(() => Ex.succeed([])),
                        I.done
                      )
                    )
                  ),
                  new RM.Exited(s.nextKey, exit)
                ]
              }
              case 'Parallel': {
                return [
                  pipe(
                    Array.from(RM.finalizers(s)).reverse(),
                    foreachParIO(([, f]) => I.result(f(exit))),
                    I.flatMap((e) =>
                      pipe(
                        Ex.collectAllPar(...e),
                        O.getOrElse(() => Ex.succeed([])),
                        I.done
                      )
                    )
                  ),
                  new RM.Exited(s.nextKey, exit)
                ]
              }
              case 'ParallelN': {
                return [
                  pipe(
                    Array.from(RM.finalizers(s)).reverse(),
                    foreachParNIO(execStrategy.n)(([, f]) => I.result(f(exit))),
                    I.flatMap((e) =>
                      pipe(
                        Ex.collectAllPar(...e),
                        O.getOrElse(() => Ex.succeed([])),
                        I.done
                      )
                    )
                  ),
                  new RM.Exited(s.nextKey, exit)
                ]
              }
            }
          }
        }
      }),
      I.flatten
    )
}
