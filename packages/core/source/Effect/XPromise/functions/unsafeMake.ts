import type { FiberId } from "../../Fiber/FiberId";
import { AtomicReference } from "../../Support/AtomicReference";
import { Pending } from "../state";
import { XPromise } from "../XPromise";

export const unsafeMake = <E, A>(fiberId: FiberId) =>
   new XPromise<E, A>(new AtomicReference(new Pending([])), [fiberId]);
