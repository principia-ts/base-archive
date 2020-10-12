import { pipe } from "@principia/core/Function";
import * as O from "@principia/core/Option";

import * as T from "../_internal/effect";
import { sequential } from "../../ExecutionStrategy";
import * as Ex from "../../Exit";
import { bindS, fromEffect, map, of } from "../core";
import type { Managed } from "../Managed";
import * as RelMap from "../ReleaseMap";
import { releaseAll } from "./releaseAll";
import { releaseMap } from "./releaseMap";

/**
 * Returns a `Managed` value that represents a managed resource that can
 * be safely swapped within the scope of the `Managed`. The function provided
 * inside the `Managed` can be used to switch the resource currently in use.
 *
 * When the resource is switched, the finalizer for the previous finalizer will
 * be executed uninterruptibly. If the effect executing inside the `use`
 * is interrupted, the finalizer for the resource currently in use is guaranteed
 * to execute.
 *
 * This constructor can be used to create an expressive control flow that uses
 * several instances of a managed resource.
 */
export const switchable = <R, E, A>(): Managed<R, never, (x: Managed<R, E, A>) => T.Effect<R, E, A>> =>
   pipe(
      of,
      bindS("releaseMap", () => releaseMap),
      bindS("key", ({ releaseMap }) =>
         pipe(
            releaseMap,
            RelMap.addIfOpen((_) => T.unit),
            T.chain(O.fold(() => T.interrupt, T.succeed)),
            fromEffect
         )
      ),
      map(({ key, releaseMap }) => (newResource) =>
         T.uninterruptibleMask(({ restore }) =>
            pipe(
               releaseMap,
               RelMap.replace(key, (_) => T.unit),
               T.chain(
                  O.fold(
                     () => T.unit,
                     (fin) => fin(Ex.unit)
                  )
               ),
               T.apSecond(T.of),
               T.bindS("r", () => T.ask<R>()),
               T.bindS("inner", () => RelMap.makeReleaseMap),
               T.bindS("a", ({ inner, r }) => restore(T.giveAll_(newResource.effect, [r, inner]))),
               T.tap(({ inner }) => RelMap.replace(key, (exit) => releaseAll(exit, sequential())(inner))(releaseMap)),
               T.map(({ a }) => a[1])
            )
         )
      )
   );
