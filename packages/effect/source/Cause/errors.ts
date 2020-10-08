import type { Cause } from "./Cause";
import { showCause } from "./instances";

export class FiberFailure<E> extends Error {
   readonly _tag = "FiberFailure";
   readonly pretty = showCause.show(this.cause);

   constructor(readonly cause: Cause<E>) {
      super();

      this.name = this._tag;
      this.stack = undefined;
   }
}

export const isFiberFailure = (u: unknown): u is FiberFailure<unknown> =>
   u instanceof FiberFailure && u._tag === "FiberFailure";

export class Untraced extends Error {
   readonly _tag = "Untraced";

   constructor(message?: string) {
      super(message);
      this.name = this._tag;
      this.stack = undefined;
   }
}

export const isUntraced = (u: unknown): u is Untraced => u instanceof Untraced && u._tag === "Untraced";

export class RuntimeError extends Error {
   readonly _tag = "RuntimeError";

   constructor(message?: string) {
      super(message);

      this.name = this._tag;
   }
}

export const isRuntime = (u: unknown): u is RuntimeError => u instanceof RuntimeError && u._tag === "RuntimeError";

export class InterruptedException extends Error {
   readonly _tag = "InterruptedException";

   constructor(message?: string) {
      super(message);
      this.name = this._tag;
   }
}

export const isInterruptedException = (u: unknown): u is InterruptedException =>
   u instanceof InterruptedException && u._tag === "InterruptedException";

export class IllegalStateException extends Error {
   readonly _tag = "IllegalStateException";

   constructor(message?: string) {
      super(message);
      this.name = this._tag;
   }
}

export const isIllegalStateException = (u: unknown): u is IllegalStateException =>
   u instanceof IllegalStateException && u._tag === "IllegalStateException";
