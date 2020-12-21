import type { Promise } from "../model";

import * as I from "../../IO/core";
import { completeWith } from "./completeWith";

/**
 * Completes the promise with the specified value.
 */
export function succeed<A>(a: A) {
  return <E>(promise: Promise<E, A>) => completeWith<E, A>(I.pure(a))(promise);
}

/**
 * Completes the promise with the specified value.
 */
export function succeed_<A, E>(promise: Promise<E, A>, a: A) {
  return completeWith<E, A>(I.pure(a))(promise);
}
