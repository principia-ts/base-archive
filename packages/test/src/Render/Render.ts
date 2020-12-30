import type { RenderParam } from './RenderParam'
import type { List } from '@principia/base/data/List'

import { flow, pipe } from '@principia/base/data/Function'
import * as L from '@principia/base/data/List'

export interface RenderFunction {
  readonly _tag: 'RenderFunction'
  readonly name: string
  readonly paramLists: List<List<RenderParam>>
  readonly toString: () => string
}

export function fn(name: string, paramLists: List<List<RenderParam>>): Render {
  return {
    _tag: 'RenderFunction',
    name,
    paramLists,
    toString() {
      return `${name}(${pipe(
        this.paramLists,
        L.map(
          flow(
            L.map((p) => p.toString()),
            L.join(', ')
          )
        ),
        L.join('')
      )})`
    }
  }
}

export interface RenderInfix {
  readonly _tag: 'RenderInfix'
  readonly left: RenderParam
  readonly op: string
  readonly right: RenderParam
  readonly toString: () => string
}

export function infix(left: RenderParam, op: string, right: RenderParam): Render {
  return {
    _tag: 'RenderInfix',
    left,
    op,
    right,
    toString() {
      return `(${this.left.toString()} ${this.op} ${this.right.toString()})`
    }
  }
}

export type Render = RenderFunction | RenderInfix
