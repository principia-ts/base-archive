import { pipe } from "../Function";
import * as I from "../IO/_core";
import { bimapM } from "./bifunctor";
import type { IORefM } from "./model";

/**
 * Transforms the `get` value of the `XRefM` with the specified effectual
 * function.
 */
export function mapM_<RA, RB, EA, EB, A, B, RC, EC, C>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, C>
): IORefM<RA, RB & RC, EA, EB | EC, A, C> {
  return pipe(self, bimapM(I.pure, f));
}

/**
 * Transforms the `get` value of the `XRefM` with the specified effectual
 * function.
 */
export function mapM<B, RC, EC, C>(
  f: (b: B) => I.IO<RC, EC, C>
): <RA, RB, EA, EB, A>(
  self: IORefM<RA, RB, EA, EB, A, B>
) => IORefM<RA, RB & RC, EA, EC | EB, A, C> {
  return (self) => mapM_(self, f);
}

/**
 * Transforms the `get` value of the `XRefM` with the specified function.
 */
export function map_<RA, RB, EA, EB, A, B, C>(self: IORefM<RA, RB, EA, EB, A, B>, f: (b: B) => C) {
  return mapM_(self, (b) => I.pure(f(b)));
}

/**
 * Transforms the `get` value of the `XRefM` with the specified function.
 */
export function map<B, C>(
  f: (b: B) => C
): <RA, RB, EA, EB, A>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EA, EB, A, C> {
  return (self) => map_(self, f);
}
