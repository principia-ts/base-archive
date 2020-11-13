import { identity, pipe } from "../../Function";
import type { Option } from "../../Option";
import { none, some } from "../../Option";
import * as T from "../Task/_core";
import { foldM, foldM_ } from "./fold";
import type { XRefM } from "./model";

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInputM_<RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (a: A1) => T.Task<RC, EC, boolean>
): XRefM<RA & RC, RB, Option<EC | EA>, EB, A1, B> {
   return pipe(
      self,
      foldM(
         (ea) => some<EA | EC>(ea),
         identity,
         (a: A1) =>
            T.ifM_(
               T.asSomeError(f(a)),
               () => T.pure(a),
               () => T.fail<Option<EA | EC>>(none())
            ),
         T.pure
      )
   );
}

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInputM<A, RC, EC, A1 extends A = A>(
   f: (a: A1) => T.Task<RC, EC, boolean>
): <RA, RB, EA, EB, B>(self: XRefM<RA, RB, EA, EB, A, B>) => XRefM<RA & RC, RB, Option<EA | EC>, EB, A1, B> {
   return (self) => filterInputM_(self, f);
}

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInput_<RA, RB, EA, EB, B, A, A1 extends A = A>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (a: A1) => boolean
): XRefM<RA, RB, Option<EA>, EB, A1, B> {
   return filterInputM_(self, (a) => T.pure(f(a)));
}

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInput<A, A1 extends A = A>(
   f: (a: A1) => boolean
): <RA, RB, EA, EB, B>(self: XRefM<RA, RB, EA, EB, A, B>) => XRefM<RA, RB, Option<EA>, EB, A1, B> {
   return (self) => filterInput_(self, f);
}

/**
 * Filters the `get` value of the `XRefM` with the specified effectual predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutputM_<RA, RB, EA, EB, A, B, RC, EC>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (b: B) => T.Task<RC, EC, boolean>
): XRefM<RA, RB & RC, EA, Option<EC | EB>, A, B> {
   return foldM_(
      self,
      (ea) => ea,
      (eb) => some<EB | EC>(eb),
      (a) => T.pure(a),
      (b) =>
         T.ifM_(
            T.asSomeError(f(b)),
            () => T.pure(b),
            () => T.fail(none())
         )
   );
}

/**
 * Filters the `get` value of the `XRefM` with the specified effectual predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutputM<B, RC, EC>(
   f: (b: B) => T.Task<RC, EC, boolean>
): <RA, RB, EA, EB, A>(self: XRefM<RA, RB, EA, EB, A, B>) => XRefM<RA, RB & RC, EA, Option<EB | EC>, A, B> {
   return (self) => filterOutputM_(self, f);
}

/**
 * Filters the `get` value of the `XRefM` with the specified predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (b: B) => boolean
): XRefM<RA, RB, EA, Option<EB>, A, B> {
   return filterOutputM_(self, (b) => T.pure(f(b)));
}

/**
 * Filters the `get` value of the `XRefM` with the specified predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput<B>(
   f: (b: B) => boolean
): <RA, RB, EA, EB, A>(self: XRefM<RA, RB, EA, EB, A, B>) => XRefM<RA, RB, EA, Option<EB>, A, B> {
   return (self) => filterOutput_(self, f);
}
