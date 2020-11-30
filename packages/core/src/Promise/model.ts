import type { FiberId } from "../IO/Fiber/FiberId";
import type { AtomicReference } from "../Utils/support/AtomicReference";
import type { State } from "./state";

export class Promise<E, A> {
  constructor(
    readonly state: AtomicReference<State<E, A>>,
    readonly blockingOn: ReadonlyArray<FiberId>
  ) {}
}

export const URI = "Promise";

export type URI = typeof URI;
