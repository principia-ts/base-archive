import * as T from "../../AIO/_core";
import type { IO } from "../../AIO/model";
import type { XPromise } from "../model";
import { completeWith } from "./completeWith";

/**
 * Fails the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function fail<E>(e: E) {
  return <A>(promise: XPromise<E, A>): IO<boolean> => completeWith<E, A>(T.fail(e))(promise);
}
