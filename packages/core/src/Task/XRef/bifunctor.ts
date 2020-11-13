import * as E from "../../Either";
import { pipe } from "../../Function";
import type { XRef } from "./model";

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified fallible functions.
 */
export function bimapEither<A, B, C, EC, D, ED>(f: (_: C) => E.Either<EC, A>, g: (_: B) => E.Either<ED, D>) {
   return <EA, EB>(_: XRef<EA, EB, A, B>): XRef<EC | EA, EB | ED, C, D> =>
      _.fold(
         (ea: EA | EC) => ea,
         (eb: EB | ED) => eb,
         f,
         g
      );
}

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified fallible functions.
 */
export function bimapEither_<EA, EB, A, B, C, EC, D, ED>(
   _: XRef<EA, EB, A, B>,
   f: (_: C) => E.Either<EC, A>,
   g: (_: B) => E.Either<ED, D>
): XRef<EC | EA, ED | EB, C, D> {
   return bimapEither(f, g)(_);
}

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified functions.
 */
export function bimap<A, B, C, D>(f: (_: C) => A, g: (_: B) => D) {
   return <EA, EB>(_: XRef<EA, EB, A, B>): XRef<EA, EB, C, D> =>
      pipe(
         _,
         bimapEither(
            (c) => E.right(f(c)),
            (b) => E.right(g(b))
         )
      );
}

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified functions.
 */
export function bimap_<EA, EB, A, B, C, D>(_: XRef<EA, EB, A, B>, f: (_: C) => A, g: (_: B) => D): XRef<EA, EB, C, D> {
   return bimap(f, g)(_);
}

/**
 * Transforms both the `set` and `get` errors of the `XRef` with the
 * specified functions.
 */
export function bimapError<EA, EB, EC, ED>(
   f: (_: EA) => EC,
   g: (_: EB) => ED
): <A, B>(_: XRef<EA, EB, A, B>) => XRef<EC, ED, A, B> {
   return (_) => _.fold(f, g, E.right, E.right);
}

/**
 * Transforms both the `set` and `get` errors of the `XRef` with the
 * specified functions.
 */
export function bimapError_<A, B, EA, EB, EC, ED>(
   _: XRef<EA, EB, A, B>,
   f: (_: EA) => EC,
   g: (_: EB) => ED
): XRef<EC, ED, A, B> {
   return bimapError(f, g)(_);
}
