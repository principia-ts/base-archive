import type { AtomicReference } from "../../support";
import type { FiberId } from "../Fiber/FiberId";
import type { State } from "./state";

export class XPromise<E, A> {
   constructor(readonly state: AtomicReference<State<E, A>>, readonly blockingOn: ReadonlyArray<FiberId>) {}
}

export const URI = "XPromise";

export type URI = typeof URI;
