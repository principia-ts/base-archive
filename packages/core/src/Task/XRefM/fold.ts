import type { Either } from "../../Either";
import * as T from "./_internal/task";
import type { XRefM } from "./model";

/**
 * Folds over the error and value types of the `XRefM`.
 */
export const fold_ = <RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   ea: (_: EA) => EC,
   eb: (_: EB) => ED,
   ca: (_: C) => Either<EC, A>,
   bd: (_: B) => Either<ED, D>
): XRefM<RA, RB, EC, ED, C, D> =>
   self.foldM(
      ea,
      eb,
      (c) => T.fromEither(() => ca(c)),
      (b) => T.fromEither(() => bd(b))
   );

/**
 * Folds over the error and value types of the `XRefM`.
 */
export const fold = <EA, EB, A, B, EC, ED, C = A, D = B>(
   ea: (_: EA) => EC,
   eb: (_: EB) => ED,
   ca: (_: C) => Either<EC, A>,
   bd: (_: B) => Either<ED, D>
) => <RA, RB>(self: XRefM<RA, RB, EA, EB, A, B>): XRefM<RA, RB, EC, ED, C, D> =>
   self.foldM(
      ea,
      eb,
      (c) => T.fromEither(() => ca(c)),
      (b) => T.fromEither(() => bd(b))
   );

/**
 * Folds over the error and value types of the `XRefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRefM`. For most use cases one of the more
 * specific combinators implemented in terms of `foldM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export const foldM_ = <RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   ea: (_: EA) => EC,
   eb: (_: EB) => ED,
   ca: (_: C) => T.Task<RC, EC, A>,
   bd: (_: B) => T.Task<RD, ED, D>
): XRefM<RA & RC, RB & RD, EC, ED, C, D> => self.foldM(ea, eb, ca, bd);

/**
 * Folds over the error and value types of the `XRefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRefM`. For most use cases one of the more
 * specific combinators implemented in terms of `foldM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export const foldM = <EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
   ea: (_: EA) => EC,
   eb: (_: EB) => ED,
   ca: (_: C) => T.Task<RC, EC, A>,
   bd: (_: B) => T.Task<RD, ED, D>
) => <RA, RB>(self: XRefM<RA, RB, EA, EB, A, B>): XRefM<RA & RC, RB & RD, EC, ED, C, D> => self.foldM(ea, eb, ca, bd);

/**
 * Folds over the error and value types of the `XRefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `foldM` but requires unifying the environment and error types.
 */
export const foldAllM_ = <RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   ea: (_: EA) => EC,
   eb: (_: EB) => ED,
   ec: (_: EB) => EC,
   ca: (_: C) => (_: B) => T.Task<RC, EC, A>,
   bd: (_: B) => T.Task<RD, ED, D>
): XRefM<RB & RA & RC, RB & RD, EC, ED, C, D> => self.foldAllM(ea, eb, ec, ca, bd);

/**
 * Folds over the error and value types of the `XRefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `foldM` but requires unifying the environment and error types.
 */
export const foldAllM = <EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
   ea: (_: EA) => EC,
   eb: (_: EB) => ED,
   ec: (_: EB) => EC,
   ca: (_: C) => (_: B) => T.Task<RC, EC, A>,
   bd: (_: B) => T.Task<RD, ED, D>
) => <RA, RB>(self: XRefM<RA, RB, EA, EB, A, B>): XRefM<RB & RA & RC, RB & RD, EC, ED, C, D> =>
   self.foldAllM(ea, eb, ec, ca, bd);
