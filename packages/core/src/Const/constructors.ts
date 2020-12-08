import { unsafeCoerce } from "../Function";
import type { Const } from "./model";

/*
 * -------------------------------------------
 * Const Constructors
 * -------------------------------------------
 */

/**
 * @optimize identity
 */
export function make<E, A = never>(e: E): Const<E, A> {
  return unsafeCoerce(e);
}
