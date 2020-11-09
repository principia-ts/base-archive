import "@principia/prelude/Operators";

import { inspect } from "util";

import * as Ac from "../source/Async";
import * as DSL from "../source/DSL";
import * as E from "../source/Either";
import { pipe } from "../source/Function";
import * as F from "../source/Function";
import * as H from "../source/Has";
import * as O from "../source/Option";
import * as Sy from "../source/Sync";
import * as L from "../source/Sync/Layer";
import * as C from "../source/Task/Exit/Cause";
import * as T from "../source/Task/Task";
import * as X from "../source/XPure";

// const c = C.fail("a");

/*
 * const buildArbitrarilyLargeCause = F.trampoline(function loop(
 *    cause: C.Cause<string>,
 *    count: number
 * ): F.Trampoline<C.Cause<string>> {
 *    const a = C.fail("a");
 *    if (count === 0) {
 *       return F.done(cause);
 *    } else {
 *       console.log(count);
 *       return F.more(() => loop(C.then(a, cause), count - 1));
 *    }
 * });
 */

// const big = buildArbitrarilyLargeCause(c, 10000);

// console.log(big);

// const b = pipe(
//    big,
//    C.fold(
//       () => "Empty",
//       (_) => _,
//       (_) => "Die",
//       (_) => "Interrupt",
//       (l, r) => l + r,
//       (l, r) => l + r
//    )
// );

// (async () => {
//    const [p, i] = pipe(
//       Ac.ask<{ n: number }>(),
//       Ac.chain(({ n }) =>
//          Ac.sequenceTPar(
//             Ac.unfailable<number>((onInterrupt) => {
//                return new Promise((resolve) => {
//                   const t = setTimeout(() => {
//                      resolve(n);
//                   }, 2000);
//                   onInterrupt(() => {
//                      clearTimeout(t);
//                   });
//                });
//             }),
//             Ac.unfailable<number>((onInterrupt) => {
//                return new Promise((resolve) => {
//                   const t = setTimeout(() => {
//                      resolve(n + 1);
//                   }, 2000);
//                   onInterrupt(() => {
//                      clearTimeout(t);
//                   });
//                });
//             })
//          )
//       ),
//       Ac.map(([a, b]) => a + b),
//       Ac.giveAll({ n: 100 }),
//       Ac.runPromiseExitInterrupt
//    );
//    setTimeout(() => {
//       i();
//    }, 100);
//    const start = Date.now();
//    console.log(await p);
//    const end = Date.now();
//    console.log(end - start);
// })();
