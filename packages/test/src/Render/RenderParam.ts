import type { Show } from '@principia/prelude/Show'

import { makeShow } from '@principia/prelude/Show'

import { AssertionM } from '../Assertion/AssertionM'

export interface RenderAssertionM {
  readonly _tag: 'RenderAssertionM'
  readonly assertion: AssertionM<any>
  readonly toString: () => string
}

export interface RenderValue {
  readonly _tag: 'RenderValue'
  readonly value: any
  readonly show: Show<any>
  readonly toString: () => string
}

export type RenderParam = RenderAssertionM | RenderValue

export function param<A>(assertion: AssertionM<A>): RenderParam
export function param<A>(value: A, show?: Show<A>): RenderParam
export function param(value: any, show?: Show<any>): RenderParam {
  if (
    value instanceof AssertionM ||
    (typeof value === 'object' && value != null && '_tag' in value && value['_tag'] === 'AssertionM')
  ) {
    return {
      _tag: 'RenderAssertionM',
      assertion: value,
      toString() {
        return this.assertion.toString()
      }
    }
  } else {
    return {
      _tag: 'RenderValue',
      value,
      show: show ?? showAny,
      toString() {
        return this.show.show(this.value)
      }
    }
  }
}

const showAny = makeShow((_: any) => JSON.stringify(_))

export function field(name: string): string {
  return `_.${name}`
}

export function quoted(name: string): string {
  return `"${name}"`
}
