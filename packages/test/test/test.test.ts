import "@principia/prelude/Operators";

import * as A from "@principia/core/Array";
import * as Eq from "@principia/core/Eq";
import * as I from "@principia/core/IO";
import * as L from "@principia/core/Layer";
import * as Show from "@principia/core/Show";
import { pipe } from "@principia/prelude";

import { assert, endsWith, equalTo, not, suite, test, TestRunner } from "../src";
import { live as liveAnnotations } from "../src/Annotation";
import * as Spec from "../src/Spec";
import { after, ignore, nonFlaky, repeat } from "../src/TestAspect";
import * as TC from "../src/TestConfig";
import { defaultTestExecutor } from "../src/TestExecutor";

const spec = suite("Suite")(
  test("test1", () => assert(100, not(equalTo(100 as number, Eq.number)))),
  test("ignoreMe", () => assert(["a", "b", "c"], endsWith(["b", "c"], Eq.string)))["@@"](nonFlaky)
)["@@"](after(I.total(() => console.log("Wow! a test ran"))));

const runner = new TestRunner(defaultTestExecutor(liveAnnotations));
const config = TC.live({ repeats: 10, retries: 0, samples: 0, shrinks: 0 });

runner.run(Spec.giveLayer(config)(spec))["|>"](I.giveLayer(runner.bootstrap))["|>"](I.run);
