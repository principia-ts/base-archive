import { PCGRandom } from './internal/PCGRandom'
import { isDefined } from './util/predicates'

export const $hash = Symbol.for('$hash')

export interface Hashable {
  [$hash](): number
}

export function isHashable(value: any): value is Hashable {
  return $hash in value
}

const CACHE  = new WeakMap<any, number>()
const RANDOM = new PCGRandom((Math.random() * 4294967296) >>> 0)

function randomInt(): number {
  return RANDOM.integer(0x7fffffff)
}

let _current = 0

export function hashString(str: string) {
  return opt(_hashString(str))
}

function _hashString(str: string) {
  let h = 5381
  let i = str.length
  while (i) h = (h * 33) ^ str.charCodeAt(--i)
  return h
}

export function hashNumber(n: number): number {
  return opt(_hashNumber(n))
}

function _hashNumber(n: number): number {
  let _n = n
  if (_n !== n || _n === Infinity) return 0
  let h = _n | 0
  if (h !== _n) h ^= _n * 0xffffffff
  while (n > 0xffffffff) h ^= _n /= 0xffffffff
  return n
}

export function hashObject(value: object): number {
  return opt(_hashObject(value))
}

function _hashObject(value: object): number {
  let h = CACHE.get(value)
  if (isDefined(h)) return h
  if (isHashable(value)) {
    h = value[$hash]()
  } else {
    h = _current++
  }
  CACHE.set(value, h)
  return h
}

export function hashPlainObject(o: any) {
  return opt(_hashPlainObject(o))
}

function _hashPlainObject(o: any): number {
  CACHE.set(o, randomInt())
  const keys = Object.keys(o)
  let h      = 12289
  for (let i = 0; i < keys.length; i++) {
    h = combineHash(h, _hashString(keys[i]))
    h = combineHash(h, _hash((o as any)[keys[i]]))
  }
  return h
}

export function hashMiscRef(o: any) {
  return opt(_hashMiscRef(o))
}

function _hashMiscRef(o: any): number {
  let h = CACHE.get(o)
  if (isDefined(h)) return h
  h = randomInt()
  CACHE.set(o, h)
  return h
}

export function hashArray(arr: Array<any> | ReadonlyArray<any>): number {
  return opt(_hashArray(arr))
}

function _hashArray(arr: Array<any> | ReadonlyArray<any>): number {
  let h = 6151
  for (let i = 0; i < arr.length; i++) {
    h = combineHash(_hashNumber(i), _hash(arr[i]))
  }
  return h
}

export function hashIterator(it: Iterator<any>): number {
  return opt(_hashIterator(it))
}

function _hashIterator(it: Iterator<any>): number {
  let res: IteratorResult<any>
  let h = 6151
  while (!(res = it.next()).done) {
    h = combineHash(h, hash(res.value))
  }
  return h
}

export function hash(value: unknown): number {
  return opt(_hash(value))
}

function isZero(value: unknown): boolean {
  return value === null || value === void 0 || value === false
}

function _hash(arg: any): number {
  let x = arg
  if (isZero(x)) return 0
  if (typeof x.valueOf === 'function' && x.valueOf !== Object.prototype.valueOf) {
    x = x.valueOf()
    if (isZero(x)) return 0
  }
  switch (typeof x) {
    case 'number':
      return _hashNumber(x)
    case 'string':
      return _hashString(x)
    case 'function':
      return _hashMiscRef(x)
    case 'object':
      return _hashObject(x)
    case 'boolean':
      return x === true ? 1 : 0
    case 'symbol':
      return _hashString(String(x))
    case 'bigint':
      return _hashString(x.toString(10))
    case 'undefined': {
      return 0
    }
  }
}

export function combineHash(x: number, y: number): number {
  return (x * 53) ^ y
}

export function opt(n: number): number {
  return (n & 0xbfffffff) | ((n >>> 1) & 0x40000000)
}
