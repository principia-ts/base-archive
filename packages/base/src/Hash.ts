import { PCGRandom } from './util/PCGRandom'

export interface Hash<A> {
  readonly hash: (a: A) => number
}

/**
 * Get 32 bit hash of string.
 *
 * Based on:
 * http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 */
export function hashString(str: string) {
  let hash = 0
  for (let i = 0, len = str.length; i < len; ++i) {
    const c = str.charCodeAt(i)
    hash    = ((hash << 5) - hash + c) | 0
  }
  return hash
}

const _random = new PCGRandom(13)

function randomInt(): number {
  return _random.integer(0x7fffffff)
}

export function getCachedRandomHash(): Hash<any> {
  const cache = new WeakMap<any, number>()
  return {
    hash: (key) => {
      if (typeof key === 'number') {
        return key
      }
      const hash = cache.get(key)
      if (hash) {
        return hash
      }
      const h = randomInt()
      cache.set(key, h)
      return h
    }
  }
}

export function combineHash(x: number, y: number): number {
  return (x * 53) ^ y
}
