import { fold_ } from "../fold";
import type { Managed } from "../model";

export const isFailure = <R, E, A>(ma: Managed<R, E, A>): Managed<R, never, boolean> =>
   fold_(
      ma,
      () => true,
      () => false
   );

export const isSuccess = <R, E, A>(ma: Managed<R, E, A>): Managed<R, never, boolean> =>
   fold_(
      ma,
      () => false,
      () => true
   );
