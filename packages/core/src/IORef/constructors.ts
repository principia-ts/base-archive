import type { UIO } from "../IO";
import * as I from "../IO/_core";
import { AtomicReference } from "../Utils/support/AtomicReference";
import type { URef } from "./model";
import { Atomic } from "./model";

/**
 * Creates a new `XRef` with the specified value.
 */
export function make<A>(a: A): UIO<URef<A>> {
  return I.total(() => new Atomic(new AtomicReference(a)));
}

/**
 * Creates a new `XRef` with the specified value.
 */
export function unsafeMake<A>(a: A): URef<A> {
  return new Atomic(new AtomicReference(a));
}
