import { pipe } from "../../Function";
import { foreachPar_ as foreachParAIO_ } from "../../IO/combinators/foreachPar";
import { foreachParN_ as foreachParNAIO_ } from "../../IO/combinators/foreachParN";
import type { ExecutionStrategy } from "../../IO/ExecutionStrategy";
import type { Exit } from "../../IO/Exit";
import * as Ex from "../../IO/Exit";
import * as XR from "../../IORef";
import * as O from "../../Option";
import * as I from "../_internal/io";
import * as RM from "../ReleaseMap";

export function releaseAll(
  exit: Exit<any, any>,
  execStrategy: ExecutionStrategy
): (_: RM.ReleaseMap) => I.UIO<any> {
  return (_) =>
    pipe(
      _.ref,
      XR.modify((s): [I.UIO<any>, RM.State] => {
        switch (s._tag) {
          case "Exited": {
            return [I.unit(), s];
          }
          case "Running": {
            switch (execStrategy._tag) {
              case "Sequential": {
                return [
                  I.chain_(
                    I.foreach_(Array.from(RM.finalizers(s)).reverse(), ([_, f]) =>
                      I.result(f(exit))
                    ),
                    (e) => I.done(O.getOrElse_(Ex.collectAll(...e), () => Ex.succeed([])))
                  ),
                  new RM.Exited(s.nextKey, exit)
                ];
              }
              case "Parallel": {
                return [
                  I.chain_(
                    foreachParAIO_(Array.from(RM.finalizers(s)).reverse(), ([_, f]) =>
                      I.result(f(exit))
                    ),
                    (e) => I.done(O.getOrElse_(Ex.collectAllPar(...e), () => Ex.succeed([])))
                  ),
                  new RM.Exited(s.nextKey, exit)
                ];
              }
              case "ParallelN": {
                return [
                  I.chain_(
                    foreachParNAIO_(execStrategy.n)(
                      Array.from(RM.finalizers(s)).reverse(),
                      ([_, f]) => I.result(f(exit))
                    ),
                    (e) => I.done(O.getOrElse_(Ex.collectAllPar(...e), () => Ex.succeed([])))
                  ),
                  new RM.Exited(s.nextKey, exit)
                ];
              }
            }
          }
        }
      }),
      I.flatten
    );
}
