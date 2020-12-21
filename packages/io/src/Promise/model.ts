import type { FiberId } from "../Fiber/FiberId";
import type { FIO } from "../IO/core";
import type { AtomicReference } from "@principia/base/util/support/AtomicReference";

export class Promise<E, A> {
  constructor(
    readonly state: AtomicReference<State<E, A>>,
    readonly blockingOn: ReadonlyArray<FiberId>
  ) {}
}

export const URI = "Promise";

export type URI = typeof URI;

export type State<E, A> = Done<E, A> | Pending<E, A>;

export class Done<E, A> {
  readonly _tag = "Done";
  constructor(readonly value: FIO<E, A>) {}
}

export class Pending<E, A> {
  readonly _tag = "Pending";
  constructor(readonly joiners: ReadonlyArray<(_: FIO<E, A>) => void>) {}
}
