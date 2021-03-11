import type { Ord } from '../Ord'

/**
 * @internal
 */
export const min_ = <A>(O: Ord<A>) => (x: A, y: A): A => (O.compare_(x, y) === 1 ? y : x)

/**
 * @internal
 */
export const max_ = <A>(O: Ord<A>) => (x: A, y: A): A => (O.compare_(x, y) === -1 ? y : x)
