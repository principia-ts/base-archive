import type { Literal } from "../Utils";
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
export function literal<A extends readonly [Literal, ...Array<Literal>]>(
  ...values: A
): Guard<unknown, A[number]> {
  return {
    is: (u): u is A[number] => values.findIndex((a) => a === u) !== -1
  };
}
