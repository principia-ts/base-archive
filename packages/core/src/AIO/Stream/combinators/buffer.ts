import { pipe } from "@principia/prelude";

import * as O from "../../../Option";
import * as M from "../../Managed";
import * as T from "../../AIO";
import * as XR from "../../XRef";
import * as Pull from "../internal/Pull";
import { Stream } from "../model";
import { toQueue_ } from "./toQueue";

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function buffer_<R, E, O>(ma: Stream<R, E, O>, capacity: number): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bindS("done", () => XR.makeManaged(false)),
      M.bindS("queue", () => toQueue_(ma, capacity)),
      M.letS("pull", ({ done, queue }) => {
        const pull = T.chain_(done.get, (b) =>
          b
            ? Pull.end
            : pipe(
                queue.take,
                T.chain(T.done),
                T.catchSome(
                  O.fold(
                    () => pipe(done.set(true), T.andThen(Pull.end), O.some),
                    (e) => O.some(T.fail(O.some(e)))
                  )
                )
              )
        );
        return pull;
      }),
      M.map(({ pull }) => pull)
    )
  );
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function buffer(capacity: number): <R, E, O>(ma: Stream<R, E, O>) => Stream<R, E, O> {
  return (ma) => buffer_(ma, capacity);
}
