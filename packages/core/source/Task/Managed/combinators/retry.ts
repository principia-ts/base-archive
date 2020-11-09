import { pipe, tuple } from "@principia/prelude";

import * as T from "../_internal/_task";
import type { Has } from "../../../Has";
import type { Clock } from "../../Clock";
import type { Schedule } from "../../Schedule";
import { Managed } from "../model";
import type { ReleaseMap } from "../ReleaseMap";

export const retry_ = <R, E, A, R1, O>(
   ma: Managed<R, E, A>,
   policy: Schedule<R1, E, O>
): Managed<R & R1 & Has<Clock>, E, A> =>
   new Managed(
      T.asksM(([env, releaseMap]: readonly [R & R1 & Has<Clock>, ReleaseMap]) =>
         pipe(
            ma.task,
            T.gives((_: R & R1 & Has<Clock>) => tuple(_, releaseMap)),
            T.retry(policy),
            T.giveAll(env)
         )
      )
   );

export const retry = <R1, E, O>(policy: Schedule<R1, E, O>) => <R, A>(
   ma: Managed<R, E, A>
): Managed<R & R1 & Has<Clock>, E, A> => retry_(ma, policy);
