import * as A from "../Array/_core";
import type { Option } from "../Option";
import { none, some } from "../Option";
import type { NonEmptyArray } from "./model";

/**
 * Append an element to the front of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const cons_: <A>(head: A, tail: ReadonlyArray<A>) => NonEmptyArray<A> = A.cons_;

/**
 * Append an element to the front of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const cons: <A>(tail: ReadonlyArray<A>) => (head: A) => NonEmptyArray<A> = A.cons;

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const snoc_: <A>(init: ReadonlyArray<A>, end: A) => NonEmptyArray<A> = A.snoc_;

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const snoc: <A>(end: A) => (init: ReadonlyArray<A>) => NonEmptyArray<A> = A.snoc;

/**
 * Builds a `NonEmptyArray` from an array returning `none` if `as` is an empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromArray<A>(as: ReadonlyArray<A>): Option<NonEmptyArray<A>> {
  return A.isNonEmpty(as) ? some(as) : none();
}
