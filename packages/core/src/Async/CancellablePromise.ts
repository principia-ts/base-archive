import * as Ex from "./AsyncExit";
import type { InterruptionState } from "./InterruptionState";

export class CancellablePromise<E, A> {
  readonly _E!: () => E;

  private reject: ((e: Ex.Rejection<any>) => void) | undefined = undefined;

  private current: Promise<A> | undefined = undefined;

  constructor(
    readonly factory: (onInterrupt: (f: () => void) => void) => Promise<A>,
    readonly interruptionState: InterruptionState
  ) {}

  promise(): Promise<A> {
    if (this.current) {
      throw new Error("Bug: promise() has been called twice");
    }
    if (this.interruptionState.interrupted) {
      throw new Error("Bug: promise already interrupted on creation");
    }
    const onInterrupt: Array<() => void> = [];
    const removeListener = this.interruptionState.listen(() => {
      onInterrupt.forEach((f) => {
        f();
      });
      this.interrupt();
    });
    const p = new Promise<A>((resolve, reject) => {
      this.reject = reject;
      this.factory((f) => {
        onInterrupt.push(f);
      })
        .then((a) => {
          removeListener();
          if (!this.interruptionState.interrupted) {
            resolve(a);
          }
        })
        .catch((e) => {
          removeListener();
          if (!this.interruptionState.interrupted) {
            reject(e);
          }
        });
    });
    this.current = p;
    return p;
  }

  interrupt() {
    this.reject?.(Ex.interrupted());
  }
}
