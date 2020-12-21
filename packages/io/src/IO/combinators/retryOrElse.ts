import type { HasClock } from "../../Clock";
import type * as S from "../../Schedule";
import type { IO } from "../core";

import * as E from "@principia/base/data/Either";
import { identity } from "@principia/base/data/Function";

import { map_ } from "../core";
import { retryOrElseEither_ } from "./retryOrElseEither";

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export function retryOrElse_<R, E, A, R1, O, R2, E2, A2>(
  fa: IO<R, E, A>,
  policy: S.Schedule<R1, E, O>,
  orElse: (e: E, o: O) => IO<R2, E2, A2>
): IO<R & R1 & R2 & HasClock, E2, A | A2> {
  return map_(retryOrElseEither_(fa, policy, orElse), E.fold(identity, identity));
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export function retryOrElse<E, R1, O, R2, E2, A2>(
  policy: S.Schedule<R1, E, O>,
  orElse: (e: E, o: O) => IO<R2, E2, A2>
) {
  return <R, A>(fa: IO<R, E, A>) => retryOrElse_(fa, policy, orElse);
}
