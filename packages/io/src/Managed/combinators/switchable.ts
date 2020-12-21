import type { Managed } from "../core";

import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import { sequential } from "../../ExecutionStrategy";
import * as Ex from "../../Exit";
import * as I from "../_internal/io";
import * as _ from "../core";
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
export function switchable<R, E, A>(): Managed<R, never, (x: Managed<R, E, A>) => I.IO<R, E, A>> {
  return pipe(
    _.do,
    _.bindS("releaseMap", () => releaseMap),
    _.bindS("key", ({ releaseMap }) =>
      pipe(
        releaseMap,
        RelMap.addIfOpen((_) => I.unit()),
        I.flatMap(O.fold(() => I.interrupt, I.succeed)),
        _.fromEffect
      )
    ),
    _.map(({ key, releaseMap }) => (newResource) =>
      I.uninterruptibleMask(({ restore }) =>
        pipe(
          releaseMap,
          RelMap.replace(key, (_) => I.unit()),
          I.flatMap(
            O.fold(
              () => I.unit(),
              (fin) => fin(Ex.unit())
            )
          ),
          I.apSecond(I.do),
          I.bindS("r", () => I.ask<R>()),
          I.bindS("inner", () => RelMap.make),
          I.bindS("a", ({ inner, r }) => restore(I.giveAll_(newResource.io, [r, inner]))),
          I.tap(({ inner }) =>
            RelMap.replace(key, (exit) => releaseAll(exit, sequential)(inner))(releaseMap)
          ),
          I.map(({ a }) => a[1])
        )
      )
    )
  );
}
