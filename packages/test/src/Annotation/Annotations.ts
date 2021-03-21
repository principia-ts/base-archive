import type { TestAnnotation } from './TestAnnotation'
import type { Has } from '@principia/base/Has'
import type { RuntimeFiber } from '@principia/io/Fiber'
import type { IO, UIO, URIO } from '@principia/io/IO'
import type { Layer } from '@principia/io/Layer'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { flow, pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import * as HS from '@principia/base/HashSet'
import { eqFiberId } from '@principia/io/Fiber'
import * as FR from '@principia/io/FiberRef'
import * as I from '@principia/io/IO'
import * as L from '@principia/io/Layer'

import { HashEqFiber } from '../util'
import { fibers } from './TestAnnotation'
import { TestAnnotationMap } from './TestAnnotationMap'

export type Annotated<A> = readonly [A, TestAnnotationMap]

export abstract class Annotations {
  abstract annotate<V>(key: TestAnnotation<V>, value: V): UIO<void>
  abstract get<V>(key: TestAnnotation<V>): UIO<V>
  abstract withAnnotation<R, E, A>(io: IO<R, E, A>): IO<R, Annotated<E>, Annotated<A>>
  abstract readonly supervisedFibers: UIO<HS.HashSet<RuntimeFiber<any, any>>>

  static annotate<V>(key: TestAnnotation<V>, value: V): URIO<Has<Annotations>, void> {
    return I.asksServiceM(AnnotationsTag)((_) => _.annotate(key, value))
  }
  static get<V>(key: TestAnnotation<V>): URIO<Has<Annotations>, V> {
    return I.asksServiceM(AnnotationsTag)((_) => _.get(key))
  }
  static withAnnotation<R, E, A>(io: IO<R, E, A>): IO<R & Has<Annotations>, Annotated<E>, Annotated<A>> {
    return I.asksServiceM(AnnotationsTag)((_) => _.withAnnotation(io))
  }
  static get supervisedFibers(): URIO<Has<Annotations>, HS.HashSet<RuntimeFiber<any, any>>> {
    return I.asksServiceM(AnnotationsTag)((_) => _.supervisedFibers)
  }
  static get live(): Layer<unknown, never, Has<Annotations>> {
    return L.fromEffect(AnnotationsTag)(
      pipe(
        FR.make(TestAnnotationMap.empty),
        I.map(
          (fiberRef): Annotations => ({
            annotate: (key, value) => FR.update_(fiberRef, (m) => m.annotate(key, value)),
            get: (key) => I.map_(FR.get(fiberRef), (m) => m.get(key)),
            withAnnotation: (io) =>
              pipe(
                fiberRef,
                FR.locally(
                  TestAnnotationMap.empty,
                  I.matchM_(
                    io,
                    (e) =>
                      pipe(
                        fiberRef,
                        FR.get,
                        I.map((m) => [e, m] as const),
                        I.swap
                      ),
                    (a) =>
                      pipe(
                        fiberRef,
                        FR.get,
                        I.map((m) => [a, m] as const)
                      )
                  )
                )
              ),
            supervisedFibers: I.descriptorWith((descriptor) =>
              pipe(
                FR.get(fiberRef),
                I.map((m) => m.get(fibers)),
                I.bind(
                  E.match(
                    (_) => I.succeed(HS.make<RuntimeFiber<any, any>>(HashEqFiber)),
                    flow(
                      I.foreach((_) => _.get),
                      I.map(A.foldl(HS.make<RuntimeFiber<any, any>>(HashEqFiber), HS.union_)),
                      I.map((s) => HS.filter_(s, (f) => !eqFiberId.equals_(f.id, descriptor.id)))
                    )
                  )
                )
              )
            )
          })
        )
      )
    )
  }
}
export const AnnotationsTag = tag<Annotations>()
