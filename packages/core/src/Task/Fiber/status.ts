import * as Sy from "../../Sync";
import type { FiberId } from "./FiberId";

export type FiberStatus = Done | Finishing | Running | Suspended;

export class Done {
   readonly _tag = "Done";
}

export class Finishing {
   readonly _tag = "Finishing";

   constructor(readonly interrupting: boolean) {}
}

export class Running {
   readonly _tag = "Running";

   constructor(readonly interrupting: boolean) {}
}

export class Suspended {
   readonly _tag = "Suspended";

   constructor(
      readonly previous: FiberStatus,
      readonly interruptible: boolean,
      readonly epoch: number,
      readonly blockingOn: ReadonlyArray<FiberId>
   ) {}
}

/**
 * @internal
 */
export const withInterruptingSafe_ = (s: FiberStatus, b: boolean): Sy.Sync<unknown, never, FiberStatus> =>
   Sy.gen(function* (_) {
      switch (s._tag) {
         case "Done": {
            return s;
         }
         case "Finishing": {
            return new Finishing(b);
         }
         case "Running": {
            return new Running(b);
         }
         case "Suspended": {
            return new Suspended(
               yield* _(withInterruptingSafe_(s.previous, b)),
               s.interruptible,
               s.epoch,
               s.blockingOn
            );
         }
      }
   });

export const withInterrupting = (b: boolean) => (s: FiberStatus): FiberStatus => Sy.runIO(withInterruptingSafe_(s, b));

export const toFinishingSafe = (s: FiberStatus): Sy.Sync<unknown, never, FiberStatus> =>
   Sy.gen(function* (_) {
      switch (s._tag) {
         case "Done": {
            return s;
         }
         case "Finishing": {
            return s;
         }
         case "Running": {
            return s;
         }
         case "Suspended": {
            return yield* _(toFinishingSafe(s.previous));
         }
      }
   });

export const toFinishing = (s: FiberStatus): FiberStatus => Sy.runIO(toFinishingSafe(s));
