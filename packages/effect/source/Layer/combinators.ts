import { pipe } from "@principia/core/Function";

import type { DefaultEnv } from "../Effect/functions/runtime";
import type { Has } from "../Has";
import * as M from "../Managed";
import * as T from "./_internal/effect";
import * as L from "./core";
import type { Layer } from "./Layer";
import type { MemoMap } from "./MemoMap";
import { HasMemoMap } from "./MemoMap";

/**
 * Type level bound to make sure a layer is complete
 */
export const main = <E, A>(layer: Layer<DefaultEnv, E, A>) => layer;

/**
 * Memoize the current layer using a MemoMap
 */
export const memo = <R, E, A>(layer: Layer<R, E, A>): Layer<Has<MemoMap> & R, E, A> =>
   pipe(
      M.fromEffect(T.askService(HasMemoMap)),
      M.chain((m) => m.getOrElseMemoize(layer)),
      L.fromRawManaged
   );
