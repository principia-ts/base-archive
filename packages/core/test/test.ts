/* eslint-disable no-unexpected-multiline */
import "@principia/prelude/Operators";

import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";

import * as A from "../src/Array";
import * as E from "../src/Either";
import * as T from "../src/IO";
import * as I from "../src/Iterable";
import * as S from "../src/Stream";
import * as Sink from "../src/Stream/Sink";
import * as Tr from "../src/Stream/Transducer";
