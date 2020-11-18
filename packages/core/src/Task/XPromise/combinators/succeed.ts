import * as T from "../../Task/_core";
import type { XPromise } from "../model";
import { completeWith } from "./completeWith";

/**
 * Completes the promise with the specified value.
 */
export function succeed<A>(a: A) {
  return <E>(promise: XPromise<E, A>) => completeWith<E, A>(T.pure(a))(promise);
}

/**
 * Completes the promise with the specified value.
 */
export function succeed_<A, E>(promise: XPromise<E, A>, a: A) {
  return completeWith<E, A>(T.pure(a))(promise);
}
