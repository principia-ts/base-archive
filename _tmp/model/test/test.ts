import { pipe } from "@principia/core/Function";

import * as T from "../source/Effect";

pipe(
   T.asksM((r: { name: string }) => T.total(() => console.log(`Hello ${r.name}`))),
   T.giveAll({ name: "Peter" }),
   T.runMain
);
