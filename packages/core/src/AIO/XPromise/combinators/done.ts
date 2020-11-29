import type { Exit } from "../../Exit";
import * as T from "../../AIO/_core";
import type { IO } from "../../AIO/model";
import type { XPromise } from "../model";
import { completeWith } from "./completeWith";

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function done<E, A>(e: Exit<E, A>) {
  return (promise: XPromise<E, A>): IO<boolean> => completeWith<E, A>(T.done(e))(promise);
}
