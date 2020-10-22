import * as T from "../source/Effect/Effect";
import { pipe } from "../source/Function";

pipe(
   T.ask<{ name: string }>(),
   T.chain(({ name }) => T.total(() => console.log(`Hello, ${name}`))),
   T.giveAll({ name: "Peter" }),
   T.runMain
);
