import type { Eq } from "@principia/prelude/Eq";
import { fromEquals } from "@principia/prelude/Eq";

import { eqFiberId } from "../Fiber/FiberId";
import type { Cause } from "./model";

/*
 * -------------------------------------------
 * Eq Cause
 * -------------------------------------------
 */

export function equalsCause<E>(x: Cause<E>, y: Cause<E>): boolean {
  switch (x._tag) {
    case "Fail": {
      return y._tag === "Fail" && x.value === y.value;
    }
    case "Empty": {
      return y._tag === "Empty";
    }
    case "Die": {
      return (
        y._tag === "Die" &&
        ((x.value instanceof Error &&
          y.value instanceof Error &&
          x.value.name === y.value.name &&
          x.value.message === y.value.message) ||
          x.value === y.value)
      );
    }
    case "Interrupt": {
      return y._tag === "Interrupt" && eqFiberId.equals(x.fiberId)(y.fiberId);
    }
    case "Both": {
      return y._tag === "Both" && equalsCause(x.left, y.left) && equalsCause(x.right, y.right);
    }
    case "Then": {
      return y._tag === "Then" && equalsCause(x.left, y.left) && equalsCause(x.right, y.right);
    }
    case "Traced": {
      return equalsCause(x.cause, y);
    }
  }
}

export const eqCause: Eq<Cause<any>> = fromEquals(equalsCause);
