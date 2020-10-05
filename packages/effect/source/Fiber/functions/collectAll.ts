import * as A from "@principia/core/Array";
import { pipe } from "@principia/core/Function";
import { just, nothing } from "@principia/core/Maybe";
import * as Mb from "@principia/core/Maybe";

import * as T from "../_internal/effect";
import * as C from "../../Cause";
import * as Ex from "../../Exit";
import { Fiber, makeSynthetic } from "../Fiber";
import { awaitAll } from "./awaitAll";

/**
 * ```haskell
 * collectAll :: Fiber f => Iterable (f e a) -> f e [a]
 * ```
 *
 * Collects all fibers into a single fiber producing an in-order list of the
 * results.
 */
export const collectAll = <E, A>(fibers: Iterable<Fiber<E, A>>) =>
   makeSynthetic({
      _tag: "SyntheticFiber",
      getRef: (ref) =>
         T._foldl(fibers, ref.initial, (a, fiber) =>
            pipe(
               fiber.getRef(ref),
               T.map((a2) => ref.join(a, a2))
            )
         ),
      inheritRefs: T._foreachUnit(fibers, (f) => f.inheritRefs),
      interruptAs: (fiberId) =>
         pipe(
            T._foreach(fibers, (f) => f.interruptAs(fiberId)),
            T.map(
               A.reduceRight(Ex.succeed(A.empty) as Ex.Exit<E, ReadonlyArray<A>>, (a, b) =>
                  Ex._bothMapCause(a, b, (_a, _b) => [_a, ..._b], C.both)
               )
            )
         ),
      poll: pipe(
         T._foreach(fibers, (f) => f.poll),
         T.map(
            A.reduceRight(just(Ex.succeed(A.empty) as Ex.Exit<E, readonly A[]>), (a, b) =>
               Mb._fold(
                  a,
                  () => nothing(),
                  (ra) =>
                     Mb._fold(
                        b,
                        () => nothing(),
                        (rb) => just(Ex._bothMapCause(ra, rb, (_a, _b) => [_a, ..._b], C.both))
                     )
               )
            )
         )
      ),
      await: awaitAll(fibers)
   });
