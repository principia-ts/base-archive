import { right } from "../Either";
import { pipe } from "../Function";
import type * as I from "../IO/_core";
import { fold } from "./fold";
import type { IORefM } from "./model";

/**
 * Transforms both the `set` and `get` values of the `XRefM` with the
 * specified effectual functions.
 */
export function bimapM_<RA, RB, EA, EB, B, RC, EC, A, RD, ED, C = A, D = B>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): IORefM<RA & RC, RB & RD, EA | EC, EB | ED, C, D> {
  return self.foldM(
    (ea: EA | EC) => ea,
    (eb: EB | ED) => eb,
    f,
    g
  );
}

/**
 * Transforms both the `set` and `get` values of the `XRefM` with the
 * specified effectual functions.
 */
export function bimapM<B, RC, EC, A, RD, ED, C = A, D = B>(
  f: (c: C) => I.IO<RC, EC, A>,
  g: (b: B) => I.IO<RD, ED, D>
): <RA, RB, EA, EB>(
  self: IORefM<RA, RB, EA, EB, A, B>
) => IORefM<RA & RC, RB & RD, EC | EA, ED | EB, C, D> {
  return (self) => bimapM_(self, f, g);
}

/**
 * Transforms both the `set` and `get` errors of the `XRefM` with the
 * specified functions.
 */
export function bimapError_<RA, RB, A, B, EA, EB, EC, ED>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (ea: EA) => EC,
  g: (eb: EB) => ED
): IORefM<RA, RB, EC, ED, A, B> {
  return pipe(
    self,
    fold(
      (ea) => f(ea),
      (eb) => g(eb),
      (a) => right(a),
      (b) => right(b)
    )
  );
}

/**
 * Transforms both the `set` and `get` errors of the `XRefM` with the
 * specified functions.
 */
export function bimapError<EA, EB, EC, ED>(
  f: (ea: EA) => EC,
  g: (eb: EB) => ED
): <RA, RB, A, B>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EC, ED, A, B> {
  return (self) => bimapError_(self, f, g);
}
