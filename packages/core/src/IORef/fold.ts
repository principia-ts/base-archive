import type * as E from "../Either";
import type { IORef } from "./model";

/**
 * Folds over the error and value types of the `XRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRef`. For most use cases one of the more specific
 * combinators implemented in terms of `fold` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 */
export function fold<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): (ref: IORef<EA, EB, A, B>) => IORef<EC, ED, C, D> {
  return (ref) => ref.fold(ea, eb, ca, bd);
}

/**
 * Folds over the error and value types of the `XRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRef`. For most use cases one of the more specific
 * combinators implemented in terms of `fold` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 */
export function fold_<EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: IORef<EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): IORef<EC, ED, C, D> {
  return ref.fold(ea, eb, ca, bd);
}

/**
 * Folds over the error and value types of the `XRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 */
export function foldAll<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): (ref: IORef<EA, EB, A, B>) => IORef<EC, ED, C, D> {
  return (ref) => ref.foldAll(ea, eb, ec, ca, bd);
}

/**
 * Folds over the error and value types of the `XRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 */
export function foldAll_<EA, EB, A, B, EC, ED, C = A, D = B>(
  ref: IORef<EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): IORef<EC, ED, C, D> {
  return ref.foldAll(ea, eb, ec, ca, bd);
}
