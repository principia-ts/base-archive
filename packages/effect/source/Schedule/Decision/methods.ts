import type * as TC from "@principia/core/typeclass-index";

import * as T from "../../Effect/core";
import { makeContinue, makeDone } from "./constructors";
import type { URI, V } from "./Decision";

export const map_: TC.UC_MapF<[URI], V> = (fa, f) => {
   switch (fa._tag) {
      case "Done":
         return makeDone(f(fa.out));
      case "Continue":
         return makeContinue(f(fa.out), fa.interval, (n, i) => T.map_(fa.next(n, i), (a) => map_(a, f)));
   }
};

export const map: TC.MapF<[URI], V> = (f) => (fa) => map_(fa, f);
