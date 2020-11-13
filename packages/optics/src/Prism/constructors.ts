import type { Predicate, Refinement } from "@principia/core/Function";
import { identity } from "@principia/core/Function";
import * as O from "@principia/core/Option";

import * as _ from "../internal";
import type { Prism } from "./model";

/*
 * -------------------------------------------
 * Prism Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export function id<S>(): Prism<S, S> {
   return {
      getOption: O.some,
      reverseGet: identity
   };
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export const fromPredicate: {
   <S, A extends S>(refinement: Refinement<S, A>): Prism<S, A>;
   <A>(predicate: Predicate<A>): Prism<A, A>;
} = _.prismFromPredicate;
