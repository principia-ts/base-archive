import * as P from '@principia/prelude'
import * as O from '@principia/prelude/Ord'

import * as N from './number'

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Eq: P.Eq<Date> = P.makeEq((x, y) => x.valueOf() === y.valueOf())

export const EqDate: P.Eq<Date> = P.makeEq((x, y) => x.getDate() === y.getDate())

export const EqMonth: P.Eq<Date> = P.makeEq((x, y) => x.getMonth() === y.getMonth())

export const EqYear: P.Eq<Date> = P.makeEq((x, y) => x.getFullYear() === y.getFullYear())

export const Ord: P.Ord<Date> = O.contramap_(N.Ord, (date) => date.valueOf())

export const Show: P.Show<Date> = P.makeShow((d) => d.toISOString())
