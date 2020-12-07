import * as I from "../../IO/_core";
import type { UIO } from "../../IO/model";
import type { Promise } from "../model";
import { completeWith_ } from "./completeWith";

/**
 * Fails the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function fail<E>(e: E) {
  return <A>(promise: Promise<E, A>): UIO<boolean> => fail_(promise, e);
}

export function fail_<E, A>(promise: Promise<E, A>, e: E): UIO<boolean> {
  return completeWith_(promise, I.fail(e));
}
