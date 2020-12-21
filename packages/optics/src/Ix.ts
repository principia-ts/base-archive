import type { At } from "./At";
import type { Iso } from "./Iso";
import type { Optional } from "./Optional";
import type * as O from "@principia/base/data/Option";

import { pipe } from "@principia/core/Function";

import * as _ from "./internal";

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Ix<S, I, A> {
  readonly index: (i: I) => Optional<S, A>;
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export function fromAt<T, J, B>(at: At<T, J, O.Option<B>>): Ix<T, J, B> {
  return {
    index: (i) => _.lensComposePrism(_.prismSome<B>())(at.at(i))
  };
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function fromIso<T, S>(iso: Iso<T, S>): <I, A>(sia: Ix<S, I, A>) => Ix<T, I, A> {
  return (sia) => ({
    index: (i) => pipe(iso, _.isoAsOptional, _.optionalComposeOptional(sia.index(i)))
  });
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export const indexArray = _.indexArray;

/**
 * @category Constructors
 * @since 1.0.0
 */
export const indexRecord = _.indexRecord;
