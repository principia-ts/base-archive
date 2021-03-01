import type { Stack } from './util/support/Stack'

import { $hash, isHashable } from './typeclass/Hashable'
import { PCGRandom } from './util/PCGRandom'
import { isArray, isIterable, isPlain } from './util/predicates'
import { makeStack } from './util/support/Stack'

export interface Hash<A> {
  readonly hash: (a: A) => number
}

const CACHE = new WeakMap<any, number>()

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
  if (h) return h
  h = randomInt()
  CACHE.set(o, h)
  return h
}

export function hash(value: unknown): number {
  return opt(_hash(value))
}

function _hash(x: unknown): number {
  let stack: Stack<unknown> | undefined = undefined
  let current: unknown | undefined      = x
  let hash                              = 0

  while (current) {
    switch (typeof current) {
      case 'object': {
        if (current != null) {
          if (isHashable(current)) {
            hash = combineHash(hash, current[$hash]())
          } else if (isArray<any>(current)) {
            for (let i = 0; i < current.length; i++) {
              stack = makeStack(current[i], stack)
            }
          } else if (isIterable(current)) {
            const it = current[Symbol.iterator]()
            let res: IteratorResult<any>
            while (!(res = it.next()).done) {
              stack = makeStack(res.value, stack)
            }
          } else if (isPlain(current)) {
            const keys = Object.keys(current).sort()
            for (let i = 0; i < keys.length; i++) {
              stack = makeStack(current[keys[i]], stack)
              hash  = combineHash(hash, _hashString(keys[i]))
            }
          }
        }
        current = undefined
        break
      }
      case 'string': {
        hash    = combineHash(hash, _hashString(current))
        current = undefined
        break
      }
      case 'bigint': {
        hash    = combineHash(hash, _hashString(current.toString(10)))
        current = undefined
        break
      }
      case 'boolean': {
        hash    = combineHash(hash, +current)
        current = undefined
        break
      }
      case 'function': {
        hash    = combineHash(hash, _hashMiscRef(current))
        current = undefined
        break
      }
      case 'number': {
        hash    = combineHash(hash, current)
        current = undefined
        break
      }
      case 'symbol': {
        current = undefined
        break
      }
      case 'undefined': {
        current = undefined
        break
      }
    }
    if (!current && stack) {
      current = stack.value
      stack   = stack.previous
    }
  }
  return hash
}

const _random = new PCGRandom(13)

function randomInt(): number {
  return _random.integer(0x7fffffff)
}

export function combineHash(x: number, y: number): number {
  return (x * 53) ^ y
}

export function opt(n: number): number {
  return (n & 0xbfffffff) | ((n >>> 1) & 0x40000000)
}
