/* eslint-disable no-unexpected-multiline */
import "@principia/prelude/Operators";

import { inspect } from "util";

import * as A from "../src/Array";
import * as E from "../src/Either";
import * as I from "../src/Iterable";
import * as L from "../src/List";
import * as S from "../src/Task/Stream";
import * as Tr from "../src/Task/Stream/Transducer";
import * as T from "../src/Task/Task";

const s = S.fromArray([2, 4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 22, 24]);

(async () => {
   const p = S.aggregate_(
      s,
      Tr.dropWhileM((n) => T.succeed(n % 2 === 0))
   )
      ["|>"](S.runCollect)
      ["|>"](T.map(L.toArray))
      ["|>"](T.runPromiseExit);

   const p1 = L.list(2, 4, 6, 7, 8, 9, 10)
      ["|>"](L.dropWhileTask((n) => T.succeed(n % 2 === 0)))
      ["|>"](T.map(L.toArray))
      ["|>"](T.runPromiseExit);

   console.log(await p1);

   console.log(await p);
})();
