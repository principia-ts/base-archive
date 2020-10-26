import { pipe } from "../../Function";
import type { Has } from "../Has";
import * as M from "../Managed";
import type { DefaultEnv } from "../Task/functions/runtime";
import * as T from "./_internal/task";
import * as L from "./core";
import type { MemoMap } from "./MemoMap";
import { HasMemoMap } from "./MemoMap";
import type { Layer } from "./model";

/**
 * Type level bound to make sure a layer is complete
 */
export const main = <E, A>(layer: Layer<DefaultEnv, E, A>) => layer;

/**
 * Memoize the current layer using a MemoMap
 */
export const memo = <R, E, A>(layer: Layer<R, E, A>): Layer<Has<MemoMap> & R, E, A> =>
   pipe(
      M.fromTask(T.askService(HasMemoMap)),
      M.chain((m) => m.getOrElseMemoize(layer)),
      L.fromRawManaged
   );
