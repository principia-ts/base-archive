/* eslint-disable no-unexpected-multiline */
import "@principia/prelude/Operators";
import { inspect } from "util";
import { pipe } from "../src/Function";

import * as I from "../src/IO";
import * as C from "../src/IO/Cause";
import { Failure } from "../src/IO/Exit";
import * as F from "../src/IO/Fiber";
