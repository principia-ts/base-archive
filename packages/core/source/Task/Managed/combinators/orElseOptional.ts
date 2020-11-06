import * as O from "../../../Option";
import { fail } from "../constructors";
import type { Managed } from "../model";
import { catchAll_ } from "./catchAll";

export const orElseOptional = <R, E, A, R1, E1, B>(
   ma: Managed<R, O.Option<E>, A>,
   that: () => Managed<R1, O.Option<E1>, B>
): Managed<R & R1, O.Option<E | E1>, A | B> =>
   catchAll_(
      ma,
      O.fold(
         () => that(),
         (e) => fail(O.some<E | E1>(e))
      )
   );
