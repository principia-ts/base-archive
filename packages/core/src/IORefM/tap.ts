import { pipe } from "../Function";
import * as I from "../IO/_core";
import { contramapM } from "./contravariant";
import { mapM } from "./functor";
import type { IORefM } from "./model";

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapInput_<RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => I.IO<RC, EC, any>
): IORefM<RA & RC, RB, EA | EC, EB, A1, B> {
  return pipe(
    self,
    contramapM((c: A1) =>
      pipe(
        f(c),
        I.as(() => c)
      )
    )
  );
}

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapInput<A, RC, EC, A1 extends A = A>(
  f: (a: A1) => I.IO<RC, EC, any>
): <RA, RB, EA, EB, B>(
  self: IORefM<RA, RB, EA, EB, A, B>
) => IORefM<RA & RC, RB, EC | EA, EB, A1, B> {
  return (self) => tapInput_(self, f);
}

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapOutput_<RA, RB, EA, EB, A, B, RC, EC>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, any>
): IORefM<RA, RB & RC, EA, EB | EC, A, B> {
  return pipe(
    self,
    mapM((b) =>
      pipe(
        f(b),
        I.as(() => b)
      )
    )
  );
}

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapOutput<B, RC, EC>(
  f: (b: B) => I.IO<RC, EC, any>
): <RA, RB, EA, EB, A>(
  self: IORefM<RA, RB, EA, EB, A, B>
) => IORefM<RA, RB & RC, EA, EC | EB, A, B> {
  return (self) => tapOutput_(self, f);
}
