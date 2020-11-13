import type { Cause } from "../../Exit/Cause";
import * as T from "../../Task/_core";
import type { IO } from "../../Task/model";
import type { XPromise } from "../model";
import { completeWith } from "./completeWith";

/**
 * Halts the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function halt<E>(e: Cause<E>) {
   return <A>(promise: XPromise<E, A>): IO<boolean> => completeWith<E, A>(T.halt(e))(promise);
}
