import * as BA from "@principia/core/FreeBooleanAlgebra";
import * as I from "@principia/core/IO";
import { isSuccess } from "@principia/core/IO/Exit";
import * as Ex from "@principia/core/IO/Exit";
import * as L from "@principia/core/Layer";
import { constVoid, fromShow, identity } from "@principia/prelude";

import * as M from "../src/Assertion";
import * as R from "../src/Render/Render";
import { valueParam } from "../src/Render/RenderParam";
import * as RP from "../src/Render/RenderParam";

const greaterThan = (n: number): M.Assertion<number> =>
  M.assertion("greaterThan", [valueParam(n)], (n1) => n1 > n);
const lessThan = (n: number): M.Assertion<number> =>
  M.assertion("lessThan", [valueParam(n)], (n1) => n1 < n);

const assertion = greaterThan(10)["&&"](lessThan(20));
const c = assertion.run(9);

const a2 = M.dies(M.containsString("die"));

const c2 = a2.run(Ex.die("die"));

console.log(a2.toString());
console.log(BA.isTrue(c2));
