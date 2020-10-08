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

export const withInterrupting = (b: boolean) => (s: FiberStatus): FiberStatus => {
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
         return new Suspended(withInterrupting(b)(s.previous), s.interruptible, s.epoch, s.blockingOn);
      }
   }
};

export const toFinishing = (s: FiberStatus): FiberStatus => {
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
         return toFinishing(s.previous);
      }
   }
};
