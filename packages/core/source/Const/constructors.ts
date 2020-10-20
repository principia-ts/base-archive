import { unsafeCoerce } from "../Function";
import type { Const } from "./model";

/*
 * -------------------------------------------
 * Const Constructors
 * -------------------------------------------
 */

export const make: <E, A = never>(e: E) => Const<E, A> = unsafeCoerce;
