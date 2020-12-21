import type { IO } from "../../IO/core";
import type { Promise } from "../model";

import { uninterruptibleMask } from "../../IO/combinators/interrupt";
import * as I from "../../IO/core";
import { done } from "./done";

/**
 * Returns an IO that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export function to<E, A>(p: Promise<E, A>) {
  return <R>(effect: IO<R, E, A>): IO<R, never, boolean> =>
    uninterruptibleMask(({ restore }) => I.flatMap_(I.result(restore(effect)), (x) => done(x)(p)));
}
