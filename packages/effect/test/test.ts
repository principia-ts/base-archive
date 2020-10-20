import { pipe } from "@principia/core/Function";

import * as T from "../source/Effect";

const a = T.gen(function* (_) {
   const a = yield* _(T.asks((_: { a: number }) => _.a));
   const b = yield* _(T.asks((_: { b: number }) => _.b));

   const c = a * b;

   return c;
});

pipe(
   a,
   T.giveAll({ a: 4, b: 4 }),
   T.chain((n) => T.total(() => console.log(n))),
   T.runMain
);
