import * as I from "../IO/_core";
import { bimapM_ } from "./bifunctor";
import type { IORefM } from "./model";

/**
 * Transforms the `set` value of the `XRefM` with the specified effectual
 * function.
 */
export function contramapM_<RA, RB, EA, EB, B, A, RC, EC, C>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => I.IO<RC, EC, A>
): IORefM<RA & RC, RB, EC | EA, EB, C, B> {
  return bimapM_(self, f, I.pure);
}

/**
 * Transforms the `set` value of the `XRefM` with the specified effectual
 * function.
 */
export function contramapM<A, RC, EC, C>(
  f: (c: C) => I.IO<RC, EC, A>
): <RA, RB, EA, EB, B>(
  self: IORefM<RA, RB, EA, EB, A, B>
) => IORefM<RA & RC, RB, EC | EA, EB, C, B> {
  return (self) => contramapM_(self, f);
}

/**
 * Transforms the `set` value of the `XRefM` with the specified function.
 */
export function contramap_<RA, RB, EA, EB, B, C, A>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => A
): IORefM<RA, RB, EA, EB, C, B> {
  return contramapM_(self, (c) => I.pure(f(c)));
}

/**
 * Transforms the `set` value of the `XRefM` with the specified function.
 */
export function contramap<C, A>(
  f: (c: C) => A
): <RA, RB, EA, EB, B>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EA, EB, C, B> {
  return (self) => contramap_(self, f);
}
