import type { Cause } from "./model";
import { showCause } from "./show";

export class FiberFailure<E> extends Error {
  readonly _tag = "FiberFailure";
  readonly pretty = showCause.show(this.cause);

  constructor(readonly cause: Cause<E>) {
    super();

    this.name = this._tag;
    this.stack = undefined;
  }
}

export function isFiberFailure(u: unknown): u is FiberFailure<unknown> {
  return u instanceof FiberFailure && u._tag === "FiberFailure";
}

export class Untraced extends Error {
  readonly _tag = "Untraced";

  constructor(message?: string) {
    super(message);
    this.name = this._tag;
    this.stack = undefined;
  }
}

export function isUntraced(u: unknown): u is Untraced {
  return u instanceof Untraced && u._tag === "Untraced";
}

export class RuntimeError extends Error {
  readonly _tag = "RuntimeError";

  constructor(message?: string) {
    super(message);

    this.name = this._tag;
  }
}

export function isRuntime(u: unknown): u is RuntimeError {
  return u instanceof RuntimeError && u._tag === "RuntimeError";
}

export class InterruptedException extends Error {
  readonly _tag = "InterruptedException";

  constructor(message?: string) {
    super(message);
    this.name = this._tag;
  }
}

export function isInterruptedException(u: unknown): u is InterruptedException {
  return u instanceof InterruptedException && u._tag === "InterruptedException";
}

export class IllegalStateException extends Error {
  readonly _tag = "IllegalStateException";

  constructor(message?: string) {
    super(message);
    this.name = this._tag;
  }
}

export function isIllegalStateException(u: unknown): u is IllegalStateException {
  return u instanceof IllegalStateException && u._tag === "IllegalStateException";
}
