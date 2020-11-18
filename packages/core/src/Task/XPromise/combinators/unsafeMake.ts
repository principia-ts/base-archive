import { AtomicReference } from "../../../Utils/support/AtomicReference";
import type { FiberId } from "../../Fiber/FiberId";
import { XPromise } from "../model";
import { Pending } from "../state";

export function unsafeMake<E, A>(fiberId: FiberId) {
  return new XPromise<E, A>(new AtomicReference(new Pending([])), [fiberId]);
}
