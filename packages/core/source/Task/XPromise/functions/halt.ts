import type { Cause } from "../../Exit/Cause";
import * as T from "../../Task/core";
import type { UIO } from "../../Task/model";
import type { XPromise } from "../model";
import { completeWith } from "./completeWith";

/**
 * Halts the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export const halt = <E>(e: Cause<E>) => <A>(promise: XPromise<E, A>): UIO<boolean> =>
   completeWith<E, A>(T.halt(e))(promise);
