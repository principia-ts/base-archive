import { pipe } from "@principia/prelude";

import * as E from "../../Either";
import * as O from "../../Option";
import * as X from "../../SIO";
import * as I from "./_internal/io";

function _integrateSIO() {
  if (X.SIOtoAIO.get._tag === "None") {
    X.SIOtoAIO.set(
      O.some(<R, E, A>(sync: X.SIO<unknown, never, R, E, A>) =>
        I.asksM((_: R) => I.suspend(() => pipe(sync, X.runEitherEnv(_), E.fold(I.fail, I.succeed))))
      )
    );
  }
}

_integrateSIO();
