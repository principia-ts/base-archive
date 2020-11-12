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
import * as List from "../src/List";
import * as O from "../src/Option";
import * as Sy from "../src/Sync";
import * as C from "../src/Task/Exit/Cause";
import * as L from "../src/Task/Layer";
import * as Sc from "../src/Task/Schedule";
import * as Dec from "../src/Task/Schedule/Decision";
import * as S from "../src/Task/Stream";
import * as Tr from "../src/Task/Stream/internal/Transducer";
import * as Sink from "../src/Task/Stream/Sink";
import * as T from "../src/Task/Task";
import * as X from "../src/XPure";
