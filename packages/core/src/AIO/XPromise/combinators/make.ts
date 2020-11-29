import { chain_ } from "../../AIO/_core";
import { fiberId } from "../../AIO/combinators/fiberId";
import { makeAs } from "./makeAs";

/**
 * Makes a new promise to be completed by the fiber creating the promise.
 */
export function make<E, A>() {
  return chain_(fiberId(), (id) => makeAs<E, A>(id));
}
