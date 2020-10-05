import * as T from "../../Effect/core";
import { XPromise } from "../XPromise";
import { completeWith } from "./completeWith";

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export const die = (e: unknown) => <E, A>(promise: XPromise<E, A>) =>
   completeWith<E, A>(T.die(e))(promise);
