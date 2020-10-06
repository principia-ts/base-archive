import chalk from "chalk";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import rimraf from "rimraf";

import { copy, onLeft, onRight } from "./common";

const rm = TE.taskify(rimraf);

pipe(
   rm("source/system"),
   TE.chain((_) => copy("matechs-effect/packages/system/src/**/*", "source/_internal", { update: true })),
   TE.fold(onLeft, onRight("Matechs Effect system copy succeeded!"))
)().catch((e) => console.log(chalk.bold.red(`Unexpected error: ${e}`), e.stack));
