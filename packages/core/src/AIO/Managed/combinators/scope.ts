import { pipe } from "@principia/prelude";

import * as T from "../_internal/aio";
import { map } from "../functor";
import type { Managed } from "../model";
import type { Finalizer } from "../ReleaseMap";
import { releaseMap } from "./releaseMap";

export class ManagedScope {
  constructor(
    readonly apply: <R, E, A>(managed: Managed<R, E, A>) => T.AIO<R, E, readonly [Finalizer, A]>
  ) {}
}

export function scope(): Managed<unknown, never, ManagedScope> {
  return pipe(
    releaseMap,
    map(
      (finalizers) =>
        new ManagedScope(
          <R, E, A>(managed: Managed<R, E, A>): T.AIO<R, E, readonly [Finalizer, A]> =>
            T.chain_(T.ask<R>(), (r) => T.giveAll_(managed.aio, [r, finalizers] as const))
        )
    )
  );
}
