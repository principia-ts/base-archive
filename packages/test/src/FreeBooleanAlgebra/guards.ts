import type { And, FreeBooleanAlgebra, Not, Or, Value } from './model'

export function isValue<A>(ba: FreeBooleanAlgebra<A>): ba is Value<A> {
  return ba._tag === 'Value'
}

export function isAnd<A>(ba: FreeBooleanAlgebra<A>): ba is And<A> {
  return ba._tag === 'And'
}

export function isOr<A>(ba: FreeBooleanAlgebra<A>): ba is Or<A> {
  return ba._tag === 'Or'
}

export function isNot<A>(ba: FreeBooleanAlgebra<A>): ba is Not<A> {
  return ba._tag === 'Not'
}
