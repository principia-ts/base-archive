import { pipe } from "../source/Function";
import * as EIO from "../source/IOEither";
import { runEither } from "../source/XPure";

pipe(
   EIO.pure(5),
   EIO.chain((n) => EIO.pure(n * n)),
   EIO.chain((n) => (n > 24 ? EIO.fail(`number too high ${n}`) : EIO.pure(n))),
   runEither,
   (e) => console.log(e)
);
