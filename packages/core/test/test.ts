/* eslint-disable no-unexpected-multiline */
import "@principia/prelude/Operators";

import { inspect } from "util";

import * as Ac from "../source/Async";
import * as DSL from "../source/DSL";
import * as E from "../source/Either";
import { pipe } from "../source/Function";
import * as F from "../source/Function";
import * as H from "../source/Has";
import { tag } from "../source/Has";
import * as O from "../source/Option";
import * as Sy from "../source/Sync";
import * as C from "../source/Task/Exit/Cause";
import * as L from "../source/Task/Layer";
import * as T from "../source/Task/Task";
import * as X from "../source/XPure";

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
