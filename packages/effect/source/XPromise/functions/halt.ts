import { Cause } from "../../Cause";
import * as T from "../../Effect/core";
import { XPromise } from "../XPromise";
import { completeWith } from "./completeWith";

/**
 * Halts the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export const halt = <E>(e: Cause<E>) => <A>(promise: XPromise<E, A>): T.UIO<boolean> =>
   completeWith<E, A>(T.halt(e))(promise);
