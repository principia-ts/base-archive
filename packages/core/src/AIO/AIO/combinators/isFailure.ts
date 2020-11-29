import { fold_ } from "../fold";
import type { AIO } from "../model";

/**
 * Folds a `AIO` to a boolean describing whether or not it is a failure
 */
export const isFailure = <R, E, A>(aio: AIO<R, E, A>): AIO<R, never, boolean> =>
  fold_(
    aio,
    () => true,
    () => false
  );
