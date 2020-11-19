import * as E from "@principia/core/Either";
import { fromEquals, getTupleEq } from "@principia/core/Eq";

import { testApplicativeAssociativity } from "../src/Applicative";
import { getRight } from "../src/Either";
import { testFunctorComposition } from "../src/Functor";

testFunctorComposition(E.Functor)(getRight, (Sa) =>
  E.getEq(
    fromEquals((_x, _y) => false),
    Sa
  )
);

testApplicativeAssociativity(E.Applicative)(getRight, (a, b, c) =>
  E.getEq(
    fromEquals((_x, _y) => false),
    fromEquals((x, y) => {
      const t1 = [x[0][0], x[0][1], x[1]] as const;
      const t2 = [y[0][0], y[0][1], y[1]] as const;
      return getTupleEq(a, b, c).equals_(t1 as any, t2 as any);
    })
  )
);
