import * as T from "../_internal/task";
import { pipe } from "../../../Function";
import * as O from "../../../Option";
import type { ExecutionStrategy } from "../../ExecutionStrategy";
import type { Exit } from "../../Exit";
import * as Ex from "../../Exit";
import { foreachPar_ as foreachParTask_ } from "../../Task/combinators/foreachPar";
import { foreachParN_ as foreachParNTask_ } from "../../Task/combinators/foreachParN";
import * as XR from "../../XRef";
import * as RM from "../ReleaseMap";

export function releaseAll(
  exit: Exit<any, any>,
  execStrategy: ExecutionStrategy
): (_: RM.ReleaseMap) => T.IO<any> {
  return (_) =>
    pipe(
      _.ref,
      XR.modify((s): [T.IO<any>, RM.State] => {
        switch (s._tag) {
          case "Exited": {
            return [T.unit(), s];
          }
          case "Running": {
            switch (execStrategy._tag) {
              case "Sequential": {
                return [
                  T.chain_(
                    T.foreach_(Array.from(RM.finalizers(s)).reverse(), ([_, f]) =>
                      T.result(f(exit))
                    ),
                    (e) => T.done(O.getOrElse_(Ex.collectAll(...e), () => Ex.succeed([])))
                  ),
                  new RM.Exited(s.nextKey, exit)
                ];
              }
              case "Parallel": {
                return [
                  T.chain_(
                    foreachParTask_(Array.from(RM.finalizers(s)).reverse(), ([_, f]) =>
                      T.result(f(exit))
                    ),
                    (e) => T.done(O.getOrElse_(Ex.collectAllPar(...e), () => Ex.succeed([])))
                  ),
                  new RM.Exited(s.nextKey, exit)
                ];
              }
              case "ParallelN": {
                return [
                  T.chain_(
                    foreachParNTask_(execStrategy.n)(
                      Array.from(RM.finalizers(s)).reverse(),
                      ([_, f]) => T.result(f(exit))
                    ),
                    (e) => T.done(O.getOrElse_(Ex.collectAllPar(...e), () => Ex.succeed([])))
                  ),
                  new RM.Exited(s.nextKey, exit)
                ];
              }
            }
          }
        }
      }),
      T.flatten
    );
}
