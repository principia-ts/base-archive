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
  console.time("a");
  const p = S.fromArray([1, 2, 3, 4, 5])
    ["|>"](
      S.aggregate(
        Tr.fold(
          0,
          () => true,
          (o, i) => o + i
        )
      )
    )
    ["|>"](S.runCollect)
    ["|>"](T.runPromiseExit);
  console.log(await p);
  console.timeEnd("a");
})();
