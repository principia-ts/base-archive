import type { Equatable } from './Structural/Equatable'
import type { Hashable } from './Structural/Hashable'

import { isObject } from './prelude'
import { $equals, equals } from './Structural/Equatable'
import { _combineHash, $hash, hash, hashString } from './Structural/Hashable'

export const CaseTypeId = Symbol()
export type CaseTypeId = typeof CaseTypeId

export interface CaseArgs {
  readonly [CaseTypeId]: ReadonlyArray<string>
}

export interface Copy<T> {
  copy(args: {} extends T ? void : Partial<T>): this
}

export interface CaseConstructor {
  [CaseTypeId]: ReadonlyArray<string>
  new <T>(args: {} extends T ? void : T): T & Copy<T> & CaseArgs
}

export function isCaseClass(u: unknown): u is CaseConstructor {
  return isObject(u) && CaseTypeId in u
}

const h0 = hashString('@principia/base/Case')

// @ts-expect-error
export const CaseClass: CaseConstructor = class<T> implements Hashable, Equatable, CaseArgs {
  private args: T
  private keys: ReadonlyArray<string> = []
  constructor(args: T) {
    this.args = args
    if (isObject(args)) {
      const keys = Object.keys(args)
      for (let i = 0; i < keys.length; i++) {
        this[keys[i]] = args[keys[i]]
      }
      this.keys = keys.sort()
    }
  }

  get [CaseTypeId](): ReadonlyArray<string> {
    return this.keys
  }

  get [$hash](): number {
    let h = h0
    for (const k of this.keys) {
      h = _combineHash(h, hash(this[k]))
    }
    return h
  }

  [$equals](that: unknown): boolean {
    if (this === that) {
      return true
    }
    if (that instanceof this.constructor) {
      const kthat = that[CaseTypeId]
      const len   = kthat.length
      if (len !== this.keys.length) {
        return false
      }

      let result = true
      let i      = 0

      while (result && i < len) {
        result = this.keys[i] === kthat[i] && equals(this[this.keys[i]], that[kthat[i]])
        i++
      }

      return result
    }
    return false
  }

  copy(args: Partial<T>): this {
    // @ts-expect-error
    return new this.constructor({ ...this.args, ...args })
  }
}
