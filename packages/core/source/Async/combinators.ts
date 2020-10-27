import type { Either } from "../Either";
import { pipe } from "../Function";
import type { Option } from "../Option";
import * as O from "../Option";
import { AtomicReference, OneShot } from "../support";
import type { Async } from ".";
import { asyncOption, succeed, suspend, total, unit } from "./constructors";
import { OnInterruptInstruction } from "./internal/Concrete";
import { chain_, flatten } from "./methods";

export const onInterrupt_ = <R, E, A, R1>(
   task: Async<R, E, A>,
   onInterrupt: () => Async<R1, never, any>
): Async<R & R1, E, A> => new OnInterruptInstruction(task, onInterrupt);

export const maybeAsyncInterrupt = <R, E, A>(
   register: (cb: (resolve: Async<R, E, A>) => void) => Either<Async<R, never, void>, Async<R, E, A>>
): Async<R, E, A> =>
   chain_(
      total(() => [new AtomicReference(false), new OneShot<Async<R, never, void>>()] as const),
      ([started, cancel]) =>
         onInterrupt_(
            pipe(
               asyncOption<R, E, Async<R, E, A>>((r) => {
                  started.set(true);
                  const ret = new AtomicReference<Option<Async<unknown, never, Async<R, E, A>>>>(O.none());
                  try {
                     const res = register((io) => r(succeed(io)));
                     switch (res._tag) {
                        case "Right": {
                           ret.set(O.some(succeed(res.right)));
                           break;
                        }
                        case "Left": {
                           cancel.set(res.left);
                        }
                     }
                  } finally {
                     if (!cancel.isSet()) {
                        cancel.set(unit);
                     }
                  }
                  return ret.get;
               }),
               flatten
            ),
            () => suspend(() => (started.get ? cancel.get() : unit))
         )
   );
