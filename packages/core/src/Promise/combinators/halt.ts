import * as I from "../../IO/_core";
import type { Cause } from "../../IO/Cause";
import type { UIO } from "../../IO/model";
import type { Promise } from "../model";
import { completeWith } from "./completeWith";

/**
 * Halts the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function halt<E>(e: Cause<E>) {
  return <A>(promise: Promise<E, A>): UIO<boolean> => completeWith<E, A>(I.halt(e))(promise);
}
