import { pipe } from "@principia/prelude";

import * as I from "../_internal/io";
import { map } from "../functor";
import type { Managed } from "../model";
import type { Finalizer } from "../ReleaseMap";
import { releaseMap } from "./releaseMap";

export class ManagedScope {
  constructor(
    readonly apply: <R, E, A>(managed: Managed<R, E, A>) => I.IO<R, E, readonly [Finalizer, A]>
  ) {}
}

export function scope(): Managed<unknown, never, ManagedScope> {
  return pipe(
    releaseMap,
    map(
      (finalizers) =>
        new ManagedScope(
          <R, E, A>(managed: Managed<R, E, A>): I.IO<R, E, readonly [Finalizer, A]> =>
            I.chain_(I.ask<R>(), (r) => I.giveAll_(managed.io, [r, finalizers] as const))
        )
    )
  );
}
