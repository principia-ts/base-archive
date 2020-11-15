/* eslint-disable no-unexpected-multiline */
import "@principia/prelude/Operators";

import { inspect } from "util";

import * as A from "../src/Array";
import * as Ac from "../src/Async";
import * as DSL from "../src/DSL";
import * as E from "../src/Either";
import { pipe } from "../src/Function";
import * as F from "../src/Function";
import * as H from "../src/Has";
import { tag } from "../src/Has";
import * as List from "../src/List";
import * as O from "../src/Option";
import * as Sy from "../src/Sync";
import * as C from "../src/Task/Exit/Cause";
import * as L from "../src/Task/Layer";
import * as Sc from "../src/Task/Schedule";
import * as Dec from "../src/Task/Schedule/Decision";
import * as S from "../src/Task/Stream";
import * as Sink from "../src/Task/Stream/Sink";
import * as Tr from "../src/Task/Stream/Transducer";
import * as T from "../src/Task/Task";
import * as X from "../src/XPure";

(async () => {
   const p = S.fromArray([1, 1, 1, 1, 2, 2])
      ["|>"](
         S.aggregateAsyncWithinEither(
            pipe(
               Tr.fold(
                  [A.empty<number>(), true as boolean] as const,
                  ([_, b]) => b,
                  (acc, el: number) => {
                     if (el === 1) return [[el, ...acc[0]], true] as const;
                     if (el === 2 && A.isEmpty(acc[0])) return [[el, ...acc[0]], false] as const;
                     else return [[el, ...acc[0]], false] as const;
                  }
               ),
               Tr.map((x) => x[0])
            ),
            Sc.forever
         )
      )
      ["|>"](S.runCollect)
      ["|>"](T.map(List.toArray))
      ["|>"](T.runPromiseExit);

   console.time("b");
   console.log(inspect(await p, false, 5));
   console.timeEnd("b");
})();
