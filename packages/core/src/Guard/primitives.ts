import type { Integer } from "../Integer";
import type { ReadonlyRecord } from "../Record";
import type { Guard } from "./Guard";

/*
 * -------------------------------------------
 * Guard Primitives
 * -------------------------------------------
 */

/**
 * @category Primitives
 * @since 1.0.0
 */
export const string: Guard<unknown, string> = {
  is: (i): i is string => typeof i === "string"
};

/**
 * Note: `NaN` is excluded
 *
 * @category Primitives
 * @since 1.0.0
 */
export const number: Guard<unknown, number> = {
  is: (i): i is number => typeof i === "number" && !isNaN(i)
};

/**
 *
 * @category Primitives
 * @since 1.0.0
 */
export const safeInteger: Guard<unknown, Integer> = {
  is: (i): i is Integer => typeof i === "number" && Number.isSafeInteger(i)
};

/**
 * @category Primitives
 * @since 1.0.0
 */
export const boolean: Guard<unknown, boolean> = {
  is: (i): i is boolean => typeof i === "boolean"
};

/**
 * @category Primitives
 * @since 1.0.0
 */
export const UnknownArray: Guard<unknown, ReadonlyArray<unknown>> = {
  is: Array.isArray
};

/**
 * @category Primitives
 * @since 1.0.0
 */
export const UnknownRecord: Guard<unknown, ReadonlyRecord<string, unknown>> = {
  is: (i): i is Record<string, unknown> => Object.prototype.toString.call(i) === "[object Object]"
};
