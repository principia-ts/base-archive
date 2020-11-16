import { pipe } from "../../Function";
import * as T from "../Task/_core";
import { contramapM } from "./contravariant";
import { mapM } from "./functor";
import type { XRefM } from "./model";

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapInput_<RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (a: A1) => T.Task<RC, EC, any>
): XRefM<RA & RC, RB, EA | EC, EB, A1, B> {
   return pipe(
      self,
      contramapM((c: A1) =>
         pipe(
            f(c),
            T.as(() => c)
         )
      )
   );
}

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapInput<A, RC, EC, A1 extends A = A>(
   f: (a: A1) => T.Task<RC, EC, any>
): <RA, RB, EA, EB, B>(self: XRefM<RA, RB, EA, EB, A, B>) => XRefM<RA & RC, RB, EC | EA, EB, A1, B> {
   return (self) => tapInput_(self, f);
}

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapOutput_<RA, RB, EA, EB, A, B, RC, EC>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (b: B) => T.Task<RC, EC, any>
): XRefM<RA, RB & RC, EA, EB | EC, A, B> {
   return pipe(
      self,
      mapM((b) =>
         pipe(
            f(b),
            T.as(() => b)
         )
      )
   );
}

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapOutput<B, RC, EC>(
   f: (b: B) => T.Task<RC, EC, any>
): <RA, RB, EA, EB, A>(self: XRefM<RA, RB, EA, EB, A, B>) => XRefM<RA, RB & RC, EA, EC | EB, A, B> {
   return (self) => tapOutput_(self, f);
}
