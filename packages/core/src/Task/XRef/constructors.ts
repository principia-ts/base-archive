import { AtomicReference } from "../../Utils/support/AtomicReference";
import type { IO } from "../Task";
import * as T from "../Task/_core";
import type { Ref } from "./model";
import { Atomic } from "./model";

/**
 * Creates a new `XRef` with the specified value.
 */
export function makeRef<A>(a: A): IO<Ref<A>> {
  return T.total(() => new Atomic(new AtomicReference(a)));
}

/**
 * Creates a new `XRef` with the specified value.
 */
export function unsafeMakeRef<A>(a: A): Ref<A> {
  return new Atomic(new AtomicReference(a));
}
