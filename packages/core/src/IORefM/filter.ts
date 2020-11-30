import { identity, pipe } from "../Function";
import * as I from "../IO/_core";
import type { Option } from "../Option";
import { none, some } from "../Option";
import { foldM, foldM_ } from "./fold";
import type { IORefM } from "./model";

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInputM_<RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => I.IO<RC, EC, boolean>
): IORefM<RA & RC, RB, Option<EC | EA>, EB, A1, B> {
  return pipe(
    self,
    foldM(
      (ea) => some<EA | EC>(ea),
      identity,
      (a: A1) =>
        I.ifM_(
          I.asSomeError(f(a)),
          () => I.pure(a),
          () => I.fail<Option<EA | EC>>(none())
        ),
      I.pure
    )
  );
}

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInputM<A, RC, EC, A1 extends A = A>(
  f: (a: A1) => I.IO<RC, EC, boolean>
): <RA, RB, EA, EB, B>(
  self: IORefM<RA, RB, EA, EB, A, B>
) => IORefM<RA & RC, RB, Option<EA | EC>, EB, A1, B> {
  return (self) => filterInputM_(self, f);
}

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInput_<RA, RB, EA, EB, B, A, A1 extends A = A>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => boolean
): IORefM<RA, RB, Option<EA>, EB, A1, B> {
  return filterInputM_(self, (a) => I.pure(f(a)));
}

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInput<A, A1 extends A = A>(
  f: (a: A1) => boolean
): <RA, RB, EA, EB, B>(
  self: IORefM<RA, RB, EA, EB, A, B>
) => IORefM<RA, RB, Option<EA>, EB, A1, B> {
  return (self) => filterInput_(self, f);
}

/**
 * Filters the `get` value of the `XRefM` with the specified effectual predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutputM_<RA, RB, EA, EB, A, B, RC, EC>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => I.IO<RC, EC, boolean>
): IORefM<RA, RB & RC, EA, Option<EC | EB>, A, B> {
  return foldM_(
    self,
    (ea) => ea,
    (eb) => some<EB | EC>(eb),
    (a) => I.pure(a),
    (b) =>
      I.ifM_(
        I.asSomeError(f(b)),
        () => I.pure(b),
        () => I.fail(none())
      )
  );
}

/**
 * Filters the `get` value of the `XRefM` with the specified effectual predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutputM<B, RC, EC>(
  f: (b: B) => I.IO<RC, EC, boolean>
): <RA, RB, EA, EB, A>(
  self: IORefM<RA, RB, EA, EB, A, B>
) => IORefM<RA, RB & RC, EA, Option<EB | EC>, A, B> {
  return (self) => filterOutputM_(self, f);
}

/**
 * Filters the `get` value of the `XRefM` with the specified predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
  self: IORefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => boolean
): IORefM<RA, RB, EA, Option<EB>, A, B> {
  return filterOutputM_(self, (b) => I.pure(f(b)));
}

/**
 * Filters the `get` value of the `XRefM` with the specified predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput<B>(
  f: (b: B) => boolean
): <RA, RB, EA, EB, A>(self: IORefM<RA, RB, EA, EB, A, B>) => IORefM<RA, RB, EA, Option<EB>, A, B> {
  return (self) => filterOutput_(self, f);
}
