import type { Exit } from "../../Exit";
import type { UIO } from "../../IO/core";
import type { Promise } from "../model";

import * as I from "../../IO/core";
import { completeWith } from "./completeWith";

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function done<E, A>(e: Exit<E, A>) {
  return (promise: Promise<E, A>): UIO<boolean> => completeWith<E, A>(I.done(e))(promise);
}
