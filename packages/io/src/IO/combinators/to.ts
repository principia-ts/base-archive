import type { Promise } from "../../Promise/model";
import type { IO } from "../core";

import { done } from "../../Promise/combinators/done";
import { flatMap_, result } from "../core";
import { uninterruptibleMask } from "./interrupt";

/**
 * Returns an IO that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export function to<E, A>(p: Promise<E, A>): <R>(effect: IO<R, E, A>) => IO<R, never, boolean> {
  return (effect) =>
    uninterruptibleMask(({ restore }) => flatMap_(result(restore(effect)), (x) => done(x)(p)));
}
