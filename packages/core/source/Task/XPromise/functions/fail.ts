import * as T from "../../Task/core";
import type { UIO } from "../../Task/model";
import type { XPromise } from "../model";
import { completeWith } from "./completeWith";

/**
 * Fails the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export const fail = <E>(e: E) => <A>(promise: XPromise<E, A>): UIO<boolean> => completeWith<E, A>(T.fail(e))(promise);
