import type { Eq } from "@principia/prelude/Eq";
import type { Ring } from "@principia/prelude/Ring";

import { allEquals } from "./utils";

export const RingLaws = {
  additiveInverse: <A>(R: Ring<A>, E: Eq<A>) => (a: A): boolean => {
    return allEquals(E)(R.sub_(a, a), R.add_(R.sub_(R.zero, a), a), R.zero);
  }
};
