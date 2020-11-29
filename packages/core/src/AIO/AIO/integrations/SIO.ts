import { pipe } from "@principia/prelude";

import * as E from "../../../Either";
import * as O from "../../../Option";
import * as X from "../../../SIO";
import * as T from "./_internal/aio";

function _integrateSIO() {
  if (X.SIOtoAIO.get._tag === "None") {
    X.SIOtoAIO.set(
      O.some(<R, E, A>(sync: X.SIO<unknown, never, R, E, A>) =>
        T.asksM((_: R) => T.suspend(() => pipe(sync, X.runEitherEnv(_), E.fold(T.fail, T.succeed))))
      )
    );
  }
}

_integrateSIO();
