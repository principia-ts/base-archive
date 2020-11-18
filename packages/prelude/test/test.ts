import { pipe } from "../source/Function";
import * as Mb from "../source/Maybe";

const a = pipe(
  [Mb.just(1), Mb.nothing(), Mb.just(3)] as const,
  Mb.mapN(([a, b, c]) => {
    console.log(a);
    console.log(b);
    console.log(c);
    return a + b + c;
  }),
  Mb.toNullable
);

console.log(a);
