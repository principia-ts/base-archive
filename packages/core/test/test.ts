/* eslint-disable no-unexpected-multiline */
import "@principia/prelude/Operators";

import { inspect } from "util";

import * as A from "../src/Array";
import * as E from "../src/Either";
import { flow, pipe } from "../src/Function";
import * as I from "../src/Iterable";
import * as L from "../src/List";
import * as M from "../src/Task/Managed";
import * as S from "../src/Task/Stream";
import * as Tr from "../src/Task/Stream/Transducer";
import * as T from "../src/Task/Task";
import * as XP from "../src/Task/XPromise";

(async () => {
   const s = S.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
   const p = S.distributedWithDynamic_(s, 3, (_) => T.succeed((_) => false))
      ["|>"](M.useNow)
      ["|>"](T.chain((a) => a))
      ["|>"](T.chain(([_, q]) => q.takeAll))
      ["|>"](T.chain((ex) => T.total(() => console.log(inspect(ex, false, 4)))))
      ["|>"](T.runMain);
})();
