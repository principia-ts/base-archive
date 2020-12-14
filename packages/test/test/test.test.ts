import "@principia/prelude/Operators";

import * as Eq from "@principia/core/Eq";
import * as I from "@principia/core/IO";
import { HasClock, LiveClock } from "@principia/core/IO/Clock";
import { NodeConsole } from "@principia/core/IO/Console";
import * as L from "@principia/core/Layer";

import * as M from "../src";
import { defaultTestExecutor } from "../src/TestExecutor";
import { fromConsole } from "../src/TestLogger";

const spec = M.suite("Test")(
  M.test("One", () => M.assert(1, M.approximatelyEquals(1, 0))),
  M.test("Two", () => M.assert("hello", M.containsString("goodbye"))),
  M.testM("Three", () =>
    M.assertM(I.succeed(["a", "b", "c"]), M.contains("b" as string, Eq.string))
  )
);

const runner = new M.TestRunner<unknown, never>(defaultTestExecutor(L.identity<unknown>()));

runner
  .run(spec)
  ["|>"](
    I.giveLayer(NodeConsole.live[">>>"](fromConsole)["+++"](L.pure(HasClock)(new LiveClock())))
  )
  ["|>"](I.run);
