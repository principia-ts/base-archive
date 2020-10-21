import { chain_ } from "../../Effect/core";
import { checkFiberId } from "../../Effect/functions/checkFiberId";
import { makeAs } from "./makeAs";

/**
 * Makes a new promise to be completed by the fiber creating the promise.
 */
export const make = <E, A>() => chain_(checkFiberId(), (id) => makeAs<E, A>(id));
