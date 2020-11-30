import * as E from "../Either";
import { identity } from "../Function";
import type { Option } from "../Option";
import { none, some } from "../Option";
import type { IORef } from "./model";

/**
 * Filters the `set` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `set` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterInput_<EA, EB, B, A, A1 extends A>(
  _: IORef<EA, EB, A, B>,
  f: (_: A1) => boolean
): IORef<Option<EA>, EB, A1, B> {
  return _.fold(some, identity, (a) => (f(a) ? E.right(a) : E.left(none())), E.right);
}

/**
 * Filters the `set` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `set` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterInput<A, A1 extends A>(
  f: (_: A1) => boolean
): <EA, EB, B>(_: IORef<EA, EB, A, B>) => IORef<Option<EA>, EB, A1, B> {
  return (_) => filterInput_(_, f);
}

/**
 * Filters the `get` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput_<EA, EB, A, B>(
  _: IORef<EA, EB, A, B>,
  f: (_: B) => boolean
): IORef<EA, Option<EB>, A, B> {
  return _.fold(identity, some, E.right, (b) => (f(b) ? E.right(b) : E.left(none())));
}

/**
 * Filters the `get` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput<B>(
  f: (_: B) => boolean
): <EA, EB, A>(_: IORef<EA, EB, A, B>) => IORef<EA, Option<EB>, A, B> {
  return (_) => filterOutput_(_, f);
}
