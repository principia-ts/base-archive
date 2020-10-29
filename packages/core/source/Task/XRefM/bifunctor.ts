import { right } from "../../Either";
import { pipe } from "../../Function";
import type * as T from "../Task/_core";
import { fold } from "./fold";
import type { XRefM } from "./model";

/**
 * Transforms both the `set` and `get` values of the `XRefM` with the
 * specified effectual functions.
 */
export const bimapM_ = <RA, RB, EA, EB, B, RC, EC, A, RD, ED, C = A, D = B>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (c: C) => T.Task<RC, EC, A>,
   g: (b: B) => T.Task<RD, ED, D>
) =>
   self.foldM(
      (ea: EA | EC) => ea,
      (eb: EB | ED) => eb,
      f,
      g
   );

/**
 * Transforms both the `set` and `get` values of the `XRefM` with the
 * specified effectual functions.
 */
export const bimapM = <B, RC, EC, A, RD, ED, C = A, D = B>(
   f: (c: C) => T.Task<RC, EC, A>,
   g: (b: B) => T.Task<RD, ED, D>
) => <RA, RB, EA, EB>(self: XRefM<RA, RB, EA, EB, A, B>) => bimapM_(self, f, g);

/**
 * Transforms both the `set` and `get` errors of the `XRefM` with the
 * specified functions.
 */
export const bimapError_ = <RA, RB, A, B, EA, EB, EC, ED>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (ea: EA) => EC,
   g: (eb: EB) => ED
): XRefM<RA, RB, EC, ED, A, B> =>
   pipe(
      self,
      fold(
         (ea) => f(ea),
         (eb) => g(eb),
         (a) => right(a),
         (b) => right(b)
      )
   );

/**
 * Transforms both the `set` and `get` errors of the `XRefM` with the
 * specified functions.
 */
export const bimapError = <EA, EB, EC, ED>(f: (ea: EA) => EC, g: (eb: EB) => ED) => <RA, RB, A, B>(
   self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, EC, ED, A, B> => bimapError_(self, f, g);
