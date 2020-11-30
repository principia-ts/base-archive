import * as E from "../Either";
import { bimapEither, bimapEither_ } from "./bifunctor";
import type { IORef } from "./model";

/**
 * Transforms the `get` value of the `XRef` with the specified fallible
 * function.
 */
export const mapEither: <B, EC, C>(
  f: (_: B) => E.Either<EC, C>
) => <EA, EB, A>(_: IORef<EA, EB, A, B>) => IORef<EA, EC | EB, A, C> = (f) =>
  bimapEither((a) => E.right(a), f);

/**
 * Transforms the `get` value of the `XRef` with the specified fallible
 * function.
 */
export const mapEither_: <EA, EB, A, B, EC, C>(
  _: IORef<EA, EB, A, B>,
  f: (_: B) => E.Either<EC, C>
) => IORef<EA, EC | EB, A, C> = (_, f) => bimapEither_(_, (a) => E.right(a), f);

/**
 * Transforms the `get` value of the `XRef` with the specified function.
 */
export const map: <B, C>(
  f: (_: B) => C
) => <EA, EB, A>(_: IORef<EA, EB, A, B>) => IORef<EA, EB, A, C> = (f) =>
  mapEither((b) => E.right(f(b)));

/**
 * Transforms the `get` value of the `XRef` with the specified function.
 */
export const map_: <EA, EB, A, B, C>(
  _: IORef<EA, EB, A, B>,
  f: (_: B) => C
) => IORef<EA, EB, A, C> = (_, f) => mapEither_(_, (b) => E.right(f(b)));
