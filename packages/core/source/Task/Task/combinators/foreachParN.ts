import * as T from "../_core";
import * as A from "../../../Array";
import { pipe, tuple } from "../../../Function";
import * as F from "../../Fiber";
import * as XP from "../../XPromise";
import * as Q from "../../XQueue";
import { bracket } from "./bracket";
import { collectAll } from "./collectAll";
import { forever } from "./forever";

/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export const foreachParN_ = (n: number) => <A, R, E, B>(
   as: Iterable<A>,
   f: (a: A) => T.Task<R, E, B>
): T.Task<R, E, ReadonlyArray<B>> =>
   pipe(
      Q.makeBounded<readonly [XP.XPromise<E, B>, A]>(n),
      bracket(
         (q) =>
            pipe(
               T.do,
               T.bindS("pairs", () =>
                  pipe(
                     as,
                     T.foreach((a) =>
                        pipe(
                           XP.make<E, B>(),
                           T.map((p) => tuple(p, a))
                        )
                     )
                  )
               ),
               T.tap(({ pairs }) => pipe(pairs, T.foreachUnit(q.offer), T.fork)),
               T.bindS("fibers", ({ pairs }) =>
                  pipe(
                     A.makeBy(n, () =>
                        pipe(
                           q.take,
                           T.chain(([p, a]) =>
                              pipe(
                                 f(a),
                                 T.foldCauseM(
                                    (c) =>
                                       pipe(
                                          pairs,
                                          T.foreach(([promise, _]) => pipe(promise, XP.halt(c)))
                                       ),
                                    (b) => pipe(p, XP.succeed(b))
                                 )
                              )
                           ),
                           forever,
                           T.fork
                        )
                     ),
                     collectAll
                  )
               ),
               T.bindS("res", ({ fibers, pairs }) =>
                  pipe(
                     pairs,
                     T.foreach(([p]) => XP.await(p)),
                     T.result,
                     T.tap(() => pipe(fibers, T.foreach(F.interrupt))),
                     T.chain(T.done)
                  )
               ),
               T.map(({ res }) => res)
            ),
         (q) => q.shutdown
      )
   );

export const foreachParN = (n: number) => <R, E, A, B>(f: (a: A) => T.Task<R, E, B>) => (
   as: Iterable<A>
): T.Task<R, E, ReadonlyArray<B>> => foreachParN_(n)(as, f);
