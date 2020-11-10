import { pipe } from "@principia/prelude";

import * as T from "../_internal/task";
import { map } from "../functor";
import type { Managed } from "../model";
import type { Finalizer } from "../ReleaseMap";
import { releaseMap } from "./releaseMap";

export class ManagedScope {
   constructor(readonly apply: <R, E, A>(managed: Managed<R, E, A>) => T.Task<R, E, readonly [Finalizer, A]>) {}
}

export const scope = (): Managed<unknown, never, ManagedScope> =>
   pipe(
      releaseMap,
      map(
         (finalizers) =>
            new ManagedScope(
               <R, E, A>(managed: Managed<R, E, A>): T.Task<R, E, readonly [Finalizer, A]> =>
                  T.chain_(T.ask<R>(), (r) => T.giveAll_(managed.task, [r, finalizers] as const))
            )
      )
   );
