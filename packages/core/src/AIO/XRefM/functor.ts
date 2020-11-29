import { pipe } from "../../Function";
import * as T from "../AIO/_core";
import { bimapM } from "./bifunctor";
import type { XRefM } from "./model";

/**
 * Transforms the `get` value of the `XRefM` with the specified effectual
 * function.
 */
export function mapM_<RA, RB, EA, EB, A, B, RC, EC, C>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.AIO<RC, EC, C>
): XRefM<RA, RB & RC, EA, EB | EC, A, C> {
  return pipe(self, bimapM(T.pure, f));
}

/**
 * Transforms the `get` value of the `XRefM` with the specified effectual
 * function.
 */
export function mapM<B, RC, EC, C>(
  f: (b: B) => T.AIO<RC, EC, C>
): <RA, RB, EA, EB, A>(self: XRefM<RA, RB, EA, EB, A, B>) => XRefM<RA, RB & RC, EA, EC | EB, A, C> {
  return (self) => mapM_(self, f);
}

/**
 * Transforms the `get` value of the `XRefM` with the specified function.
 */
export function map_<RA, RB, EA, EB, A, B, C>(self: XRefM<RA, RB, EA, EB, A, B>, f: (b: B) => C) {
  return mapM_(self, (b) => T.pure(f(b)));
}

/**
 * Transforms the `get` value of the `XRefM` with the specified function.
 */
export function map<B, C>(
  f: (b: B) => C
): <RA, RB, EA, EB, A>(self: XRefM<RA, RB, EA, EB, A, B>) => XRefM<RA, RB, EA, EB, A, C> {
  return (self) => map_(self, f);
}
