import * as T from "../Task/_core";
import { bimapM_ } from "./bifunctor";
import type { XRefM } from "./model";

/**
 * Transforms the `set` value of the `XRefM` with the specified effectual
 * function.
 */
export function contramapM_<RA, RB, EA, EB, B, A, RC, EC, C>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => T.Task<RC, EC, A>
): XRefM<RA & RC, RB, EC | EA, EB, C, B> {
  return bimapM_(self, f, T.pure);
}

/**
 * Transforms the `set` value of the `XRefM` with the specified effectual
 * function.
 */
export function contramapM<A, RC, EC, C>(
  f: (c: C) => T.Task<RC, EC, A>
): <RA, RB, EA, EB, B>(self: XRefM<RA, RB, EA, EB, A, B>) => XRefM<RA & RC, RB, EC | EA, EB, C, B> {
  return (self) => contramapM_(self, f);
}

/**
 * Transforms the `set` value of the `XRefM` with the specified function.
 */
export function contramap_<RA, RB, EA, EB, B, C, A>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => A
): XRefM<RA, RB, EA, EB, C, B> {
  return contramapM_(self, (c) => T.pure(f(c)));
}

/**
 * Transforms the `set` value of the `XRefM` with the specified function.
 */
export function contramap<C, A>(
  f: (c: C) => A
): <RA, RB, EA, EB, B>(self: XRefM<RA, RB, EA, EB, A, B>) => XRefM<RA, RB, EA, EB, C, B> {
  return (self) => contramap_(self, f);
}
