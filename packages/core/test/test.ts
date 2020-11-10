/* eslint-disable no-unexpected-multiline */
import "@principia/prelude/Operators";

import { inspect } from "util";

import * as Ac from "../src/Async";
import * as DSL from "../src/DSL";
import * as E from "../src/Either";
import { pipe } from "../src/Function";
import * as F from "../src/Function";
import * as H from "../src/Has";
import { tag } from "../src/Has";
import * as O from "../src/Option";
import * as Sy from "../src/Sync";
import * as C from "../src/Task/Exit/Cause";
import * as L from "../src/Task/Layer";
import * as T from "../src/Task/Task";
import * as X from "../src/XPure";

interface Service {
   a: string;
   b: number;
}

const HasService = tag<Service>();

const LiveService = L.pure(HasService)({
   a: "Hello",
   b: 42
});

T.asksService(HasService)((s) => s.a)
   ["|>"](T.chain((s) => T.total(() => console.log(s))))
   ["|>"](LiveService.use)
   ["|>"](T.runMain);
