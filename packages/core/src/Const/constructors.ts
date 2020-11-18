import { unsafeCoerce } from "../Function";
import type { Const } from "./model";

/*
 * -------------------------------------------
 * Const Constructors
 * -------------------------------------------
 */

export function make<E, A = never>(e: E): Const<E, A> {
  return unsafeCoerce(e);
}
