import { unsafeCoerce } from "../Function";
import type { Const } from "./Const";

/*
 * -------------------------------------------
 * Const Constructors
 * -------------------------------------------
 */

export const make: <E, A = never>(e: E) => Const<E, A> = unsafeCoerce;
