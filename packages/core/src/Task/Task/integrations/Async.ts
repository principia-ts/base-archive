import * as Ac from "../../../Async";
import * as O from "../../../Option";
import * as T from "./_internal/task";

function _integrateAsync() {
  if (Ac.asyncTaskIntegration.get._tag === "None") {
    Ac.asyncTaskIntegration.set(
      O.some(<R, E, A>(async: Ac.Async<R, E, A>) =>
        T.asksM((_: R) =>
          T.asyncInterrupt<R, E, A>((resolve) => {
            const interrupt = Ac.runAsyncEnv(async, _, (exit) => {
              switch (exit._tag) {
                case "Success": {
                  resolve(T.succeed(exit.value));
                  break;
                }
                case "Failure": {
                  resolve(T.fail(exit.error));
                  break;
                }
                case "Interrupt": {
                  resolve(T.interrupt);
                }
              }
            });
            return T.total(() => {
              interrupt();
            });
          })
        )
      )
    );
  }
}

_integrateAsync();
