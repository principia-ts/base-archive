import { AtomicReference } from "../../../support/AtomicReference";
import type { FiberId } from "../../Fiber/FiberId";
import { XPromise } from "../model";
import { Pending } from "../state";

export const unsafeMake = <E, A>(fiberId: FiberId) =>
   new XPromise<E, A>(new AtomicReference(new Pending([])), [fiberId]);
