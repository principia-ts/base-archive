import type { Ord } from '../Ord'

export const min_ = <A>(O: Ord<A>) => (x: A, y: A): A => (O.compare_(x, y) === 1 ? y : x)

export const max_ = <A>(O: Ord<A>) => (x: A, y: A): A => (O.compare_(x, y) === -1 ? y : x)
