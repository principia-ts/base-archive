import { pipe } from "../../Function";
import * as T from "../Task/_core";
import { bimapM } from "./bifunctor";
import type { XRefM } from "./model";

/**
 * Transforms the `get` value of the `XRefM` with the specified effectual
 * function.
 */
export const mapM_ = <RA, RB, EA, EB, A, B, RC, EC, C>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (b: B) => T.Task<RC, EC, C>
) => pipe(self, bimapM(T.pure, f));

/**
 * Transforms the `get` value of the `XRefM` with the specified effectual
 * function.
 */
export const mapM = <B, RC, EC, C>(f: (b: B) => T.Task<RC, EC, C>) => <RA, RB, EA, EB, A>(
   self: XRefM<RA, RB, EA, EB, A, B>
) => mapM_(self, f);

/**
 * Transforms the `get` value of the `XRefM` with the specified function.
 */
export const map_ = <RA, RB, EA, EB, A, B, C>(self: XRefM<RA, RB, EA, EB, A, B>, f: (b: B) => C) =>
   mapM_(self, (b) => T.pure(f(b)));

/**
 * Transforms the `get` value of the `XRefM` with the specified function.
 */
export const map = <B, C>(f: (b: B) => C) => <RA, RB, EA, EB, A>(self: XRefM<RA, RB, EA, EB, A, B>) => map_(self, f);
