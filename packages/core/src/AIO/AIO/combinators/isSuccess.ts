import { fold_ } from "../fold";
import type { AIO } from "../model";

/**
 * Folds a `AIO` to a boolean describing whether or not it is a success
 */
export const isSuccess = <R, E, A>(aio: AIO<R, E, A>): AIO<R, never, boolean> =>
  fold_(
    aio,
    () => false,
    () => true
  );
