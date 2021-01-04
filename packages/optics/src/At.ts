import type { Iso } from './Iso'
import type { Lens } from './Lens'

import { pipe } from '@principia/base/data/Function'

import * as _ from './internal'

/*
 * -------------------------------------------
 * At Model
 * -------------------------------------------
 */

export interface At<S, I, A> {
  readonly at: (i: I) => Lens<S, A>
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Lift an instance of `At` using an `Iso`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromIso<T, S>(iso: Iso<T, S>): <I, A>(sia: At<S, I, A>) => At<T, I, A> {
  return (sia) => ({
    at: (i) => pipe(iso, _.isoAsLens, _.lensComposeLens(sia.at(i)))
  })
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export const atRecord = _.atRecord
