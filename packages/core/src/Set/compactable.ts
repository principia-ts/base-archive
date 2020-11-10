import type { Eq } from "@principia/prelude/Eq";
import type { Separated } from "@principia/prelude/Utils";

import type { Either } from "../Either";
import { identity } from "../Function";
import type { Option } from "../Option";
import { mapOption } from "./filterable";
import { elem } from "./guards";

/*
 * -------------------------------------------
 * Compactable Set
 * -------------------------------------------
 */

export const compact = <A>(E: Eq<A>): ((fa: ReadonlySet<Option<A>>) => ReadonlySet<A>) => mapOption(E)(identity);

export const separate = <E, A>(EE: Eq<E>, EA: Eq<A>) => (
   fa: ReadonlySet<Either<E, A>>
): Separated<ReadonlySet<E>, ReadonlySet<A>> => {
   const elemEE = elem(EE);
   const elemEA = elem(EA);
   const left: Set<E> = new Set();
   const right: Set<A> = new Set();
   fa.forEach((e) => {
      switch (e._tag) {
         case "Left":
            if (!elemEE(e.left)(left)) {
               left.add(e.left);
            }
            break;
         case "Right":
            if (!elemEA(e.right)(right)) {
               right.add(e.right);
            }
            break;
      }
   });
   return { left, right };
};
