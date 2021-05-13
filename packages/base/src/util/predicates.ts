import type { Constructor, Primitive } from './types'

export function isDefined<A>(value: A | undefined): value is A {
  return value !== undefined
}

export function isUndefined<A>(value: A | undefined): value is undefined {
  return value === undefined
}

export function isNonNull<A>(value: A | null): value is A {
  return value !== null
}

export function isNull<A>(value: A | null): value is null {
  return value === null
}

export function isNonNullable<A>(value: A | null | undefined): value is A {
  return value != null
}

export function isNullable<A>(value: A | null | undefined): value is null | undefined {
  return value == null
}

export function isIterable<A>(value: any): value is Iterable<A> {
  return Symbol.iterator in value
}

export function isArray<A>(value: A | Array<A> | ReadonlyArray<A>): value is Array<A>
export function isArray<A>(value: any): value is Array<A>
export function isArray(value: any): boolean {
  return Array.isArray(value)
}

export function isObject<A extends Function>(value: A): false
export function isObject(value: unknown): value is object
export function isObject<A>(value: A | Primitive): value is A
export function isObject<A>(value: A | Primitive): boolean {
  return typeof value === 'object' && value !== null
}

export function isFunction(value: any): value is Function {
  return typeof value === 'function'
}

export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean'
}

export function isString(value: any): value is string {
  return typeof value === 'string'
}

export function isNumber(value: any): value is number {
  return typeof value === 'number'
}

export function isByte(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 255
}

export function isSymbol(value: any): value is symbol {
  return typeof value === 'symbol'
}

export function isPlain(value: any): value is object {
  return isObject(value) && value.constructor === Object
}

export function isInstanceOf<C extends Constructor<A>, A>(type: C): (value: any) => value is A {
  return (value): value is A => value instanceof type
}
