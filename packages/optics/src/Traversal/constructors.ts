import { implementModifyF } from "../internal";
import * as _ from "../internal";
import type { Traversal } from "./model";

/*
 * -------------------------------------------
 * Traversal Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export function id<S>(): Traversal<S, S> {
   return {
      modifyF: implementModifyF<S, S>()((_) => (_) => (f) => f)
   };
}

/**
 * Create a `Traversal` from a `Traversable`
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromTraversable = _.fromTraversable;
