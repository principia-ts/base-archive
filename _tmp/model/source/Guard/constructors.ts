import type { Literal } from "../utils";
import type { Guard } from "./Guard";

/*
 * -------------------------------------------
 * Guard Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export const literal = <A extends readonly [Literal, ...Array<Literal>]>(...values: A): Guard<unknown, A[number]> => ({
   is: (u): u is A[number] => values.findIndex((a) => a === u) !== -1
});
