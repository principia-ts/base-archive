import { pipe } from "@principia/base/Function";

import * as T from "../source/Effect";

const logPromiseResult = async <A>(promise: Promise<A>) => {
   console.log(await promise);
};

const ex = pipe(
   [T.pure("A"), T.pure(1), T.pure(true)] as const,
   T.mapN(([a, b, c]) => a + b + c),
   T.runPromiseExit
);

logPromiseResult(ex);
