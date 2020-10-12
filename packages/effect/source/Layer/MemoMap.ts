import { pipe, tuple } from "@principia/core/Function";
import { insert } from "@principia/core/Map";

import { sequential } from "../ExecutionStrategy";
import type { Exit } from "../Exit/Exit";
import type { HasTag } from "../Has";
import { has } from "../Has";
import type { Finalizer, ReleaseMap } from "../Managed/ReleaseMap";
import * as RelMap from "../Managed/ReleaseMap";
import * as XP from "../XPromise";
import * as XR from "../XRef";
import * as XRM from "../XRefM";
import * as T from "./_internal/effect";
import * as M from "./_internal/managed";
import type { Layer } from "./Layer";

/**
 * A `MemoMap` memoizes dependencies.
 */

export class MemoMap {
   constructor(readonly ref: XRM.RefM<ReadonlyMap<Layer<any, any, any>, readonly [T.IO<any, any>, Finalizer]>>) {}

   /**
    * Checks the memo map to see if a dependency exists. If it is, immediately
    * returns it. Otherwise, obtains the dependency, stores it in the memo map,
    * and adds a finalizer to the outer `Managed`.
    */
   getOrElseMemoize = <R, E, A>(layer: Layer<R, E, A>) =>
      M.managed<R, E, A>(
         pipe(
            this.ref,
            XRM.modify((m) => {
               const inMap = m.get(layer);

               if (inMap) {
                  const [acquire, release] = inMap;

                  const cached = T.asksM(([_, rm]: readonly [R, ReleaseMap]) =>
                     pipe(
                        acquire as T.IO<E, A>,
                        T.onExit((ex) => {
                           switch (ex._tag) {
                              case "Success": {
                                 return RelMap.add(release)(rm);
                              }
                              case "Failure": {
                                 return T.unit;
                              }
                           }
                        }),
                        T.map((x) => [release, x] as readonly [Finalizer, A])
                     )
                  );

                  return T.pure(tuple(cached, m));
               } else {
                  return pipe(
                     T.of,
                     T.bindS("observers", () => XR.makeRef(0)),
                     T.bindS("promise", () => XP.make<E, A>()),
                     T.bindS("finalizerRef", () => XR.makeRef<Finalizer>(RelMap.noopFinalizer)),
                     T.letS("resource", ({ finalizerRef, observers, promise }) =>
                        T.uninterruptibleMask(({ restore }) =>
                           pipe(
                              T.of,
                              T.bindS("env", () => T.ask<readonly [R, ReleaseMap]>()),
                              T.letS("a", ({ env: [a] }) => a),
                              T.letS("outerReleaseMap", ({ env: [_, outerReleaseMap] }) => outerReleaseMap),
                              T.bindS("innerReleaseMap", () => RelMap.makeReleaseMap),
                              T.bindS("tp", ({ a, innerReleaseMap, outerReleaseMap }) =>
                                 restore(
                                    pipe(
                                       T.giveAll_(layer.build.effect, [a, innerReleaseMap]),
                                       T.result,
                                       T.chain((e) => {
                                          switch (e._tag) {
                                             case "Failure": {
                                                return pipe(
                                                   promise,
                                                   XP.halt(e.cause),
                                                   T.chain(
                                                      () =>
                                                         M.releaseAll(e, sequential())(innerReleaseMap) as T.IO<E, any>
                                                   ),
                                                   T.chain(() => T.halt(e.cause))
                                                );
                                             }
                                             case "Success": {
                                                return pipe(
                                                   T.of,
                                                   T.tap(() =>
                                                      finalizerRef.set((e) =>
                                                         T.whenM(
                                                            pipe(
                                                               observers,
                                                               XR.modify((n) => [n === 1, n - 1])
                                                            )
                                                         )(M.releaseAll(e, sequential())(innerReleaseMap) as T.UIO<any>)
                                                      )
                                                   ),
                                                   T.tap(() =>
                                                      pipe(
                                                         observers,
                                                         XR.update((n) => n + 1)
                                                      )
                                                   ),
                                                   T.bindS("outerFinalizer", () =>
                                                      RelMap.add((e) => T.chain_(finalizerRef.get, (f) => f(e)))(
                                                         outerReleaseMap
                                                      )
                                                   ),
                                                   T.tap(() => pipe(promise, XP.succeed(e.value[1]))),
                                                   T.map(({ outerFinalizer }) => tuple(outerFinalizer, e.value[1]))
                                                );
                                             }
                                          }
                                       })
                                    )
                                 )
                              ),
                              T.map(({ tp }) => tp)
                           )
                        )
                     ),
                     T.letS(
                        "memoized",
                        ({ finalizerRef, observers, promise }) =>
                           [
                              pipe(
                                 promise,
                                 XP.await,
                                 T.onExit((e) => {
                                    switch (e._tag) {
                                       case "Failure": {
                                          return T.unit;
                                       }
                                       case "Success": {
                                          return pipe(
                                             observers,
                                             XR.update((n) => n + 1)
                                          );
                                       }
                                    }
                                 })
                              ),
                              (e: Exit<any, any>) => T.chain_(finalizerRef.get, (f) => f(e))
                           ] as readonly [T.IO<any, any>, Finalizer]
                     ),
                     T.map(({ memoized, resource }) =>
                        tuple(
                           resource as T.Effect<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>,
                           insert(layer, memoized)(m) as ReadonlyMap<
                              Layer<any, any, any>,
                              readonly [T.IO<any, any>, Finalizer]
                           >
                        )
                     )
                  );
               }
            }),
            T.flatten
         )
      );
}

export const HasMemoMap = has(MemoMap);
export type HasMemoMap = HasTag<typeof HasMemoMap>;
