import type { Either } from "../Either";
import * as I from "./_internal/io";
import type { IORefM } from "./model";

/**
 * Folds over the error and value types of the `XRefM`.
 */
export function fold_<RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
): IORefM<RA, RB, EC, ED, C, D> {
  return self.foldM(
    ea,
    eb,
    (c) => I.fromEither(() => ca(c)),
    (b) => I.fromEither(() => bd(b))
  );
}

/**
 * Folds over the error and value types of the `XRefM`.
 */
export function fold<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
): <RA, RB>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EC, ED, C, D> {
  return (self) =>
    self.foldM(
      ea,
      eb,
      (c) => I.fromEither(() => ca(c)),
      (b) => I.fromEither(() => bd(b))
    );
}

/**
 * Folds over the error and value types of the `XRefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRefM`. For most use cases one of the more
 * specific combinators implemented in terms of `foldM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export function foldM_<RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): IORefM<RA & RC, RB & RD, EC, ED, C, D> {
  return self.foldM(ea, eb, ca, bd);
}

/**
 * Folds over the error and value types of the `XRefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRefM`. For most use cases one of the more
 * specific combinators implemented in terms of `foldM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export function foldM<EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): <RA, RB>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA & RC, RB & RD, EC, ED, C, D> {
  return (self) => self.foldM(ea, eb, ca, bd);
}

/**
 * Folds over the error and value types of the `XRefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `foldM` but requires unifying the environment and error types.
 */
export function foldAllM_<RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): IORefM<RB & RA & RC, RB & RD, EC, ED, C, D> {
  return self.foldAllM(ea, eb, ec, ca, bd);
}

/**
 * Folds over the error and value types of the `XRefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `foldM` but requires unifying the environment and error types.
 */
export function foldAllM<EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => I.IO<RC, EC, A>,
  bd: (_: B) => I.IO<RD, ED, D>
): <RA, RB>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RB & RA & RC, RB & RD, EC, ED, C, D> {
  return (self) => self.foldAllM(ea, eb, ec, ca, bd);
}
