import { flow } from "../Function";
import type { AsyncExit } from "./AsyncExit";
import { failure, success } from "./AsyncExit";
import { succeed, unfailable } from "./constructors";
import { foldM_ } from "./fold";
import type { Async } from "./model";
import { FinalizeInstruction } from "./model";
import { chain_ } from "./monad";

export function sleep(ms: number): Async<unknown, never, void> {
   return unfailable<void>(
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
}

export function delay_<R, E, A>(async: Async<R, E, A>, ms: number): Async<R, E, A> {
   return chain_(sleep(ms), () => async);
}

export function delay(ms: number): <R, E, A>(async: Async<R, E, A>) => Async<R, E, A> {
   return (async) => delay_(async, ms);
}

export function result<R, E, A>(async: Async<R, E, A>): Async<R, never, AsyncExit<E, A>> {
   return foldM_(async, flow(failure, succeed), flow(success, succeed));
}

export function onInterrupt_<R, E, A, R1, A1>(
   async: Async<R, E, A>,
   onInterrupted: () => Async<R1, never, A1>
): Async<R & R1, E, A> {
   return new FinalizeInstruction(async, onInterrupted);
}

export function onInterrupt<R1, A1>(
   onInterrupted: () => Async<R1, never, A1>
): <R, E, A>(async: Async<R, E, A>) => Async<R & R1, E, A> {
   return (async) => onInterrupt_(async, onInterrupted);
}
