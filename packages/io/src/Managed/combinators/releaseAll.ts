import type { ExecutionStrategy } from '../../ExecutionStrategy'
import type { Exit } from '../../Exit'

import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'

import * as Ex from '../../Exit'
import { foreachExec as foreachExecIO } from '../../IO/combinators/foreachExec'
import * as Ref from '../../Ref'
import * as I from '../internal/io'
import * as RM from '../ReleaseMap'

export function releaseAll(exit: Exit<any, any>, execStrategy: ExecutionStrategy): (_: RM.ReleaseMap) => I.UIO<any> {
  return (_) =>
    pipe(
      _.ref,
      Ref.modify((s): [I.UIO<any>, RM.State] => {
        switch (s._tag) {
          case 'Exited': {
            return [I.unit(), s]
          }
          case 'Running': {
            return [
              pipe(
                Array.from(RM.finalizers(s)).reverse(),
                foreachExecIO(execStrategy, ([, f]) => I.result(f(exit))),
                I.bind((e) =>
                  pipe(
                    execStrategy._tag === 'Sequential' ? Ex.collectAll(...e) : Ex.collectAllPar(...e),
                    O.getOrElse(() => Ex.succeed([])),
                    I.done
                  )
                )
              ),
              new RM.Exited(s.nextKey, exit)
            ]
            /*
             * switch (execStrategy._tag) {
             *   case 'Sequential': {
             *     return [
             *       pipe(
             *         Array.from(RM.finalizers(s)).reverse(),
             *         I.foreach(([, f]) => I.result(f(exit))),
             *         I.bind((e) =>
             *           pipe(
             *             Ex.collectAll(...e),
             *             O.getOrElse(() => Ex.succeed([])),
             *             I.done
             *           )
             *         )
             *       ),
             *       new RM.Exited(s.nextKey, exit)
             *     ]
             *   }
             *   case 'Parallel': {
             *     return [
             *       pipe(
             *         Array.from(RM.finalizers(s)).reverse(),
             *         foreachParIO(([, f]) => I.result(f(exit))),
             *         I.bind((e) =>
             *           pipe(
             *             Ex.collectAllPar(...e),
             *             O.getOrElse(() => Ex.succeed([])),
             *             I.done
             *           )
             *         )
             *       ),
             *       new RM.Exited(s.nextKey, exit)
             *     ]
             *   }
             *   case 'ParallelN': {
             *     return [
             *       pipe(
             *         Array.from(RM.finalizers(s)).reverse(),
             *         foreachParNIO(execStrategy.n)(([, f]) => I.result(f(exit))),
             *         I.bind((e) =>
             *           pipe(
             *             Ex.collectAllPar(...e),
             *             O.getOrElse(() => Ex.succeed([])),
             *             I.done
             *           )
             *         )
             *       ),
             *       new RM.Exited(s.nextKey, exit)
             *     ]
             *   }
             * }
             */
          }
        }
      }),
      I.flatten
    )
}
