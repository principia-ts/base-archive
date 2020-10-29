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
export const filterInputM_ = <RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (a: A1) => T.Task<RC, EC, boolean>
): XRefM<RA & RC, RB, Option<EC | EA>, EB, A1, B> =>
   pipe(
      self,
      foldM(
         (ea) => some<EA | EC>(ea),
         identity,
         (a: A1) => T.ifM(T.asSomeError(f(a)))(() => T.pure(a))(() => T.fail<Option<EA | EC>>(none())),
         T.pure
      )
   );

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export const filterInputM = <A, RC, EC, A1 extends A = A>(f: (a: A1) => T.Task<RC, EC, boolean>) => <RA, RB, EA, EB, B>(
   self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA & RC, RB, Option<EC | EA>, EB, A1, B> => filterInputM_(self, f);

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export const filterInput_ = <RA, RB, EA, EB, B, A, A1 extends A = A>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (a: A1) => boolean
): XRefM<RA, RB, Option<EA>, EB, A1, B> => filterInputM_(self, (a) => T.pure(f(a)));

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export const filterInput = <A, A1 extends A = A>(f: (a: A1) => boolean) => <RA, RB, EA, EB, B>(
   self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, Option<EA>, EB, A1, B> => filterInput_(self, f);

/**
 * Filters the `get` value of the `XRefM` with the specified effectual predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterOutputM_ = <RA, RB, EA, EB, A, B, RC, EC>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (b: B) => T.Task<RC, EC, boolean>
): XRefM<RA, RB & RC, EA, Option<EC | EB>, A, B> =>
   foldM_(
      self,
      (ea) => ea,
      (eb) => some<EB | EC>(eb),
      (a) => T.pure(a),
      (b) => T.ifM(T.asSomeError(f(b)))(() => T.pure(b))(() => T.fail(none()))
   );

/**
 * Filters the `get` value of the `XRefM` with the specified effectual predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterOutputM = <B, RC, EC>(f: (b: B) => T.Task<RC, EC, boolean>) => <RA, RB, EA, EB, A>(
   self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB & RC, EA, Option<EC | EB>, A, B> => filterOutputM_(self, f);

/**
 * Filters the `get` value of the `XRefM` with the specified predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterOutput_ = <RA, RB, EA, EB, A, B>(
   self: XRefM<RA, RB, EA, EB, A, B>,
   f: (b: B) => boolean
): XRefM<RA, RB, EA, Option<EB>, A, B> => filterOutputM_(self, (b) => T.pure(f(b)));

/**
 * Filters the `get` value of the `XRefM` with the specified predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterOutput = <B>(f: (b: B) => boolean) => <RA, RB, EA, EB, A>(
   self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, EA, Option<EB>, A, B> => filterOutput_(self, f);
