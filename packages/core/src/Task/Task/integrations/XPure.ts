import { pipe } from "@principia/prelude";

import * as E from "../../../Either";
import * as O from "../../../Option";
import * as X from "../../../XPure";
import * as T from "./_internal/task";

function _integrateXPure() {
  if (X.XPureTaskIntegration.get._tag === "None") {
    X.XPureTaskIntegration.set(
      O.some(<R, E, A>(sync: X.XPure<unknown, never, R, E, A>) =>
        T.asksM((_: R) => T.suspend(() => pipe(sync, X.runEitherEnv(_), E.fold(T.fail, T.succeed))))
      )
    );
  }
}

_integrateXPure();
