import type { FiberId } from "../../IO/Fiber/FiberId";
import { AtomicReference } from "../../Utils/support/AtomicReference";
import { Promise } from "../model";
import { Pending } from "../state";

export function unsafeMake<E, A>(fiberId: FiberId) {
  return new Promise<E, A>(new AtomicReference(new Pending([])), [fiberId]);
}
