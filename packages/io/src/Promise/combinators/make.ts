import { fiberId } from "../../IO/combinators/fiberId";
import { flatMap_ } from "../../IO/core";
import { makeAs } from "./makeAs";

/**
 * Makes a new promise to be completed by the fiber creating the promise.
 */
export function make<E, A>() {
  return flatMap_(fiberId(), (id) => makeAs<E, A>(id));
}
