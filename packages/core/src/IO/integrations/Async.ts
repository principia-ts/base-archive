import * as Ac from "../../Async";
import * as O from "../../Option";
import * as I from "./_internal/io";

function _integrateAsync() {
  if (Ac.AsynctoIO.get._tag === "None") {
    Ac.AsynctoIO.set(
      O.some(<R, E, A>(async: Ac.Async<R, E, A>) =>
        I.asksM((_: R) =>
          I.asyncInterrupt<R, E, A>((resolve) => {
            const interrupt = Ac.runAsyncEnv(async, _, (exit) => {
              switch (exit._tag) {
                case "Success": {
                  resolve(I.succeed(exit.value));
                  break;
                }
                case "Failure": {
                  resolve(I.fail(exit.error));
                  break;
                }
                case "Interrupt": {
                  resolve(I.interrupt);
                }
              }
            });
            return I.total(() => {
              interrupt();
            });
          })
        )
      )
    );
  }
}

_integrateAsync();
