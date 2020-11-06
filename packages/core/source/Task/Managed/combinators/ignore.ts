import { fold_ } from "../fold";
import type { Managed } from "../model";

/**
 * Ignores the success or failure of a Managed
 */
export const ignore = <R, E, A>(ma: Managed<R, E, A>): Managed<R, never, void> =>
   fold_(
      ma,
      () => {
         /* */
      },
      () => {
         /* */
      }
   );
