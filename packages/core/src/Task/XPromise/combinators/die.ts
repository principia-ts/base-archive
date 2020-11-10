import * as T from "../../Task/_core";
import type { XPromise } from "../model";
import { completeWith } from "./completeWith";

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export const die = (e: unknown) => <E, A>(promise: XPromise<E, A>) => completeWith<E, A>(T.die(e))(promise);
