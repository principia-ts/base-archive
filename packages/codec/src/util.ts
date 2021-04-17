import type { RoseTree } from '@principia/base/RoseTree'
import type { Mutable } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as Ev from '@principia/base/Eval'
import * as RT from '@principia/base/RoseTree'
import * as P from '@principia/base/typeclass'

/*
 * -------------------------------------------
 * internal
 * -------------------------------------------
 */

export const isUnknownRecord = (u: unknown): u is Record<PropertyKey, unknown> =>
  u !== null && typeof u === 'object' && !Array.isArray(u)

export type Intersectable = Record<string, any>

/**
 * @internal
 */
export function typeOf(x: unknown): string {
  return x === null ? 'null' : typeof x
}

/**
 * @internal
 */
function intersectEval<A extends Intersectable, B extends Intersectable>(a: A, b: B): Ev.Eval<A & B> {
  return Ev.defer(() => {
    let out: Ev.Eval<Record<string, any>> = Ev.now({ ...a })
    for (const k in b) {
      const bk = b[k]
      if (isUnknownRecord(bk)) {
        out = Ev.bind_(out, (mut_out) =>
          Ev.map_(intersectEval(mut_out[k], bk), (intersected) => {
            mut_out[k] = intersected
            return mut_out
          })
        )
      } else {
        out = Ev.map_(out, (mut_out) => {
          mut_out[k] = bk
          return mut_out
        })
      }
    }
    return out as Ev.Eval<A & B>
  })
}

export function _intersect<A, B>(a: A, b: B): A & B {
  return intersectEval(a, b).value
}

export interface IndexMap {
  '0': 0
  '1': 1
  '2': 2
  '3': 3
  '4': 4
  '5': 5
  '6': 6
  '7': 7
  '8': 8
  '9': 9
  '10': 10
  '11': 11
  '12': 12
  '13': 13
  '14': 14
  '15': 15
  '16': 16
  '17': 17
  '18': 18
  '19': 19
  '20': 20
}

export type CastToNumber<T> = T extends keyof IndexMap ? IndexMap[T] : number

export type MutableTree<A> = Mutable<RoseTree<A>>
export type MutableForest<A> = Array<MutableTree<A>>

/**
 * Merges an array of `RoseTree`s based on their value
 */
export function mergeEqualValues<A>(EA: P.Eq<A>): (forest: RT.Forest<A>) => RT.Forest<A> {
  return (forest) => {
    const collectedValues: A[]         = []
    const mut_merged: MutableForest<A> = []
    for (let i = 0; i < forest.length; i++) {
      const t = forest[i]
      if (collectedValues.find((p) => EA.equals_(p, t.value))) {
        // value has already been collected
        continue
      } else {
        // copy tree
        let merge: RoseTree<A> = RT.make(t.value, t.forest)
        collectedValues.push(t.value)
        // get the remaining trees in the input
        const remaining = forest.slice(i + 1)
        // concatenate forests of equal value trees
        for (let j = 0; j < remaining.length; j++) {
          const w = remaining[j]
          if (EA.equals_(merge.value, w.value)) {
            merge = RT.make(merge.value, A.concat_(merge.forest, w.forest))
          }
        }
        mut_merged.push(merge)
      }
    }

    // merge the inner trees
    for (let i = 0; i < mut_merged.length; i++) {
      mut_merged[i].forest = mergeEqualValues(EA)(mut_merged[i].forest)
    }

    return mut_merged
  }
}

export const EqStrNum: P.Eq<string | number> = P.makeEq((x, y) => {
  if (typeof x === 'string' && typeof y === 'string') {
    return x === y
  }
  if (typeof x === 'number' && typeof y === 'number') {
    return x === y
  }
  return false
})
