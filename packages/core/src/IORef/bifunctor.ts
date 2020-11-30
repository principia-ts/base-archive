import * as E from "../Either";
import { pipe } from "../Function";
import type { IORef } from "./model";

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified fallible functions.
 */
export function bimapEither<A, B, C, EC, D, ED>(
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
) {
  return <EA, EB>(_: IORef<EA, EB, A, B>): IORef<EC | EA, EB | ED, C, D> =>
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
  _: IORef<EA, EB, A, B>,
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
): IORef<EC | EA, ED | EB, C, D> {
  return bimapEither(f, g)(_);
}

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified functions.
 */
export function bimap<A, B, C, D>(f: (_: C) => A, g: (_: B) => D) {
  return <EA, EB>(_: IORef<EA, EB, A, B>): IORef<EA, EB, C, D> =>
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
export function bimap_<EA, EB, A, B, C, D>(
  _: IORef<EA, EB, A, B>,
  f: (_: C) => A,
  g: (_: B) => D
): IORef<EA, EB, C, D> {
  return bimap(f, g)(_);
}

/**
 * Transforms both the `set` and `get` errors of the `XRef` with the
 * specified functions.
 */
export function bimapError<EA, EB, EC, ED>(
  f: (_: EA) => EC,
  g: (_: EB) => ED
): <A, B>(_: IORef<EA, EB, A, B>) => IORef<EC, ED, A, B> {
  return (_) => _.fold(f, g, E.right, E.right);
}

/**
 * Transforms both the `set` and `get` errors of the `XRef` with the
 * specified functions.
 */
export function bimapError_<A, B, EA, EB, EC, ED>(
  _: IORef<EA, EB, A, B>,
  f: (_: EA) => EC,
  g: (_: EB) => ED
): IORef<EC, ED, A, B> {
  return bimapError(f, g)(_);
}
