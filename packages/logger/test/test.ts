import "@principia/prelude/Operators";

import * as T from "@principia/core/Task";
import * as C from "@principia/core/Task/Console";
import * as L from "@principia/core/Task/Layer";
import chalk from "chalk";
import * as path from "path";

import * as Log from "../src/Logger";

const LoggerConfig = Log.loggerConfig({
  path: path.resolve(process.cwd(), "test/test.log"),
  level: "debug"
});

const LiveChalk = L.create(Log.Chalk).pure({ chalk });

const LiveConsole = L.create(C.Console).pure(new C.NodeConsole());

const LiveLogger = LoggerConfig["+++"](LiveChalk)["+++"](LiveConsole)[">>>"](Log.LiveLogger);

T.pure("A value from somewhere")
  ["|>"](T.tap((x) => Log.debug(() => `This is a debug message: ${x}`)))
  ["|>"](T.giveLayer(LiveLogger))
  ["|>"](T.run);
