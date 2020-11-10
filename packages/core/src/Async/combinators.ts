import { flow } from "../Function";
import type { AsyncExit } from "./AsyncExit";
import { failure, success } from "./AsyncExit";
import { succeed, unfailable } from "./constructors";
import { foldM_ } from "./fold";
import type { Async } from "./model";
import { FinalizeInstruction } from "./model";
import { chain_ } from "./monad";

export const sleep = (ms: number): Async<unknown, never, void> =>
   unfailable<void>(
      (onInterrupt) =>
         new Promise((resolve) => {
            const timer = setTimeout(() => {
               resolve(undefined);
            }, ms);
            onInterrupt(() => {
               clearInterval(timer);
            });
         })
   );

export const delay_ = <R, E, A>(async: Async<R, E, A>, ms: number): Async<R, E, A> => chain_(sleep(ms), () => async);

export const delay = (ms: number) => <R, E, A>(async: Async<R, E, A>): Async<R, E, A> => delay_(async, ms);

export const result = <R, E, A>(async: Async<R, E, A>): Async<R, never, AsyncExit<E, A>> =>
   foldM_(async, flow(failure, succeed), flow(success, succeed));

export const onInterrupt_ = <R, E, A, R1, A1>(
   async: Async<R, E, A>,
   onInterrupted: () => Async<R1, never, A1>
): Async<R & R1, E, A> => new FinalizeInstruction(async, onInterrupted);

export const onInterrupt = <R1, A1>(onInterrupted: () => Async<R1, never, A1>) => <R, E, A>(
   async: Async<R, E, A>
): Async<R & R1, E, A> => onInterrupt_(async, onInterrupted);
