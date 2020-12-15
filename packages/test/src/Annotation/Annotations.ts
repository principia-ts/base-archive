import * as A from "@principia/core/Array";
import * as E from "@principia/core/Either";
import * as Eq from "@principia/core/Eq";
import type { Has } from "@principia/core/Has";
import { tag } from "@principia/core/Has";
import type { IO, UIO, URIO } from "@principia/core/IO";
import * as I from "@principia/core/IO";
import type { RuntimeFiber } from "@principia/core/IO/Fiber";
import { eqFiberId } from "@principia/core/IO/Fiber";
import * as FR from "@principia/core/IO/FiberRef";
import type { Layer } from "@principia/core/Layer";
import * as L from "@principia/core/Layer";
import * as RS from "@principia/core/Set";
import { flow, pipe } from "@principia/prelude";

import type { TestAnnotation } from "./TestAnnotation";
import { fibers } from "./TestAnnotation";
import { TestAnnotationMap } from "./TestAnnotationMap";

export type Annotated<A> = readonly [A, TestAnnotationMap];

export interface Annotations {
  readonly annotate: <V>(key: TestAnnotation<V>, value: V) => UIO<void>;
  readonly get: <V>(key: TestAnnotation<V>) => UIO<V>;
  readonly withAnnotation: <R, E, A>(io: IO<R, E, A>) => IO<R, Annotated<E>, Annotated<A>>;
  readonly supervisedFibers: UIO<ReadonlySet<RuntimeFiber<any, any>>>;
}
export const Annotations = tag<Annotations>();

export function annotate<V>(key: TestAnnotation<V>, value: V): URIO<Has<Annotations>, void> {
  return I.asksServiceM(Annotations)((_) => _.annotate(key, value));
}

export function get<V>(key: TestAnnotation<V>): URIO<Has<Annotations>, V> {
  return I.asksServiceM(Annotations)((_) => _.get(key));
}

export function withAnnotation<R, E, A>(
  io: IO<R, E, A>
): IO<R & Has<Annotations>, Annotated<E>, Annotated<A>> {
  return I.asksServiceM(Annotations)((_) => _.withAnnotation(io));
}

export const supervisedFibers: URIO<
  Has<Annotations>,
  ReadonlySet<RuntimeFiber<any, any>>
> = I.asksServiceM(Annotations)((_) => _.supervisedFibers);

export const live: Layer<unknown, never, Has<Annotations>> = L.fromEffect(Annotations)(
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
              I.foldM_(
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
            I.chain(
              E.fold(
                (_) => I.succeed(RS.empty()),
                flow(
                  I.foreach((_) => _.get),
                  I.map(
                    A.reduce(
                      RS.empty<RuntimeFiber<any, any>>(),
                      RS.union_(Eq.contramap_(eqFiberId, (_: RuntimeFiber<any, any>) => _.id))
                    )
                  ),
                  I.map((s) => RS.filter_(s, (f) => !eqFiberId.equals_(f.id, descriptor.id)))
                )
              )
            )
          )
        )
      })
    )
  )
);
