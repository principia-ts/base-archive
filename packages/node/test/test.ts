import { Integer } from "@principia/core/Integer";
import * as T from "@principia/core/Task";
import * as S from "@principia/core/Task/Stream";
import * as Sink from "@principia/core/Task/Stream/Sink";
import * as fs from "fs";
import * as path from "path";
import * as Con from "@principia/core/Task/Console";
import * as E from "@principia/core/Either";
import { inspect } from "util";

import * as PS from "../src/process";

/*
 * const readLine = PS.stdin["|>"](S.run(Sink.take(1)));
 * 
 * const program = T.gen(function* (_) {
 *   const console = yield* _(Con.Console);
 *   yield* _(console.log("Enter some space-separated numbers:"));
 *   const [input] = yield* _(readLine);
 *   yield* _(
 *     E.fold_(
 *       input,
 *       (err) => console.log(err),
 *       (b) =>
 *         b
 *           .toString()
 *           .split(" ")
 *           .reduce((acc, v) => acc + parseFloat(v), 0)
 *           ["|>"](console.log)
 *     )
 *   );
 * });
 */

