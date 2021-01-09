import type { FreeBooleanAlgebra } from './model'

import { identity } from '@principia/base/Function'

import { fold_ } from './fold'
import { and_, not, or_ } from './operations'

export function chain_<A, B>(ma: FreeBooleanAlgebra<A>, f: (a: A) => FreeBooleanAlgebra<B>): FreeBooleanAlgebra<B> {
  return fold_(ma, f, and_, or_, not)
}

export function chain<A, B>(f: (a: A) => FreeBooleanAlgebra<B>): (ma: FreeBooleanAlgebra<A>) => FreeBooleanAlgebra<B> {
  return (ma) => chain_(ma, f)
}

export function flatten<A>(mma: FreeBooleanAlgebra<FreeBooleanAlgebra<A>>): FreeBooleanAlgebra<A> {
  return chain_(mma, identity)
}
