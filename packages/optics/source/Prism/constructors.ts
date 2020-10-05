import { identity, Predicate, Refinement } from "@principia/core/Function";
import * as Mb from "@principia/core/Maybe";

import * as _ from "../internal";
import { Prism } from "./Prism";

/*
 * -------------------------------------------
 * Prism Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export const id = <S>(): Prism<S, S> => ({
   getMaybe: Mb.just,
   reverseGet: identity
});

/**
 * @category Constructors
 * @since 1.0.0
 */
export const fromPredicate: {
   <S, A extends S>(refinement: Refinement<S, A>): Prism<S, A>;
   <A>(predicate: Predicate<A>): Prism<A, A>;
} = _.prismFromPredicate;
