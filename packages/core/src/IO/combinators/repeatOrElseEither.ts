import type { Either } from "../../Either";
import * as E from "../../Either";
import { pipe } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { chain, foldM, map } from "../_core";
import type { HasClock } from "../Clock";
import type { IO } from "../model";
import type { Schedule } from "../Schedule";
import * as S from "../Schedule";
import { orDie } from "./orDie";

/**
 * ```haskell
 * repeatOrElseEither_ :: (
 *    IO r e a,
 *    Schedule r1 a b,
 *    ((e, Option b) -> IO r2 e2 c)
 * ) -> IO (r & r1 & r2 & HasClock) e2 (Either c b)
 * ```
 *
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an IO that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeatOrElseEither_<R, R1, R2, E, E2, A, B, C>(
  fa: IO<R, E, A>,
  sc: Schedule<R1, A, B>,
  f: (_: E, __: Option<B>) => IO<R2, E2, C>
): IO<R & R1 & R2 & HasClock, E2, Either<C, B>> {
  return pipe(
    S.driver(sc),
    chain((driver) => {
      function loop(a: A): IO<R & R1 & R2 & HasClock, E2, Either<C, B>> {
        return pipe(
          driver.next(a),
          foldM(
            () => pipe(orDie(driver.last), map(E.right)),
            (b) =>
              pipe(
                fa,
                foldM(
                  (e) => pipe(f(e, O.some(b)), map(E.left)),
                  (a) => loop(a)
                )
              )
          )
        );
      }
      return pipe(
        fa,
        foldM(
          (e) => pipe(f(e, O.none()), map(E.left)),
          (a) => loop(a)
        )
      );
    })
  );
}
