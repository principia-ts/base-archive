import type { Option } from '@principia/base/Option'

import * as A from '@principia/base/Array'
import * as O from '@principia/base/Option'
import * as Str from '@principia/base/string'
import { pipe } from '@principia/prelude/function'

import * as TA from '../Annotation'

export class LeafRenderer<V> {
  readonly _tag = 'LeafRenderer'
  constructor(readonly annotation: TA.TestAnnotation<V>, readonly render: (_: ReadonlyArray<V>) => Option<string>) {}

  run(ancestors: ReadonlyArray<TA.TestAnnotationMap>, child: TA.TestAnnotationMap) {
    return O.match_(
      this.render(A.prepend(child.get(this.annotation))(A.map_(ancestors, (m) => m.get(this.annotation)))),
      () => [],
      (s) => [s]
    )
  }
}

export class CompositeRenderer {
  readonly _tag = 'CompositeRenderer'
  constructor(readonly renderers: ReadonlyArray<TestAnnotationRenderer>) {}

  run(ancestors: ReadonlyArray<TA.TestAnnotationMap>, child: TA.TestAnnotationMap): ReadonlyArray<string> {
    return A.bind_(this.renderers, (r) => r.run(ancestors, child))
  }
}

export type TestAnnotationRenderer = LeafRenderer<any> | CompositeRenderer

export function combine_(self: TestAnnotationRenderer, that: TestAnnotationRenderer): TestAnnotationRenderer {
  return self._tag === 'CompositeRenderer'
    ? that._tag === 'CompositeRenderer'
      ? new CompositeRenderer(A.concat_(self.renderers, that.renderers))
      : new CompositeRenderer(A.append_(self.renderers, that))
    : that._tag === 'CompositeRenderer'
    ? new CompositeRenderer(A.prepend_(that.renderers, self))
    : new CompositeRenderer([self, that])
}

export const ignored: TestAnnotationRenderer = new LeafRenderer(TA.ignored, ([child, ..._]) =>
  child === 0 ? O.None() : O.Some(`ignored: ${child}`)
)

export const repeated: TestAnnotationRenderer = new LeafRenderer(TA.repeated, ([child, ..._]) =>
  child === 0 ? O.None() : O.Some(`repeated: ${child}`)
)

export const retried: TestAnnotationRenderer = new LeafRenderer(TA.retried, ([child, ..._]) =>
  child === 0 ? O.None() : O.Some(`retried: ${child}`)
)

export const tagged: TestAnnotationRenderer = new LeafRenderer(TA.tagged, ([child, ..._]) =>
  child.keyMap.size === 0 ? O.None() : O.Some(`tagged: ${pipe(A.from(child), A.map(Str.surround('"')), A.join(', '))}`)
)

export const timed: TestAnnotationRenderer = new LeafRenderer(TA.timing, ([child, ..._]) =>
  child === 0 ? O.None() : O.Some(`${child}ms`)
)

export const silent: TestAnnotationRenderer = {
  _tag: 'CompositeRenderer',
  renderers: [],
  run: (ancestors, child) => A.empty()
}

export const defaultTestAnnotationRenderer: TestAnnotationRenderer = new CompositeRenderer([
  ignored,
  repeated,
  retried,
  tagged,
  timed
])
