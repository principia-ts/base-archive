import { AtomicReference } from "../../Utils/support/AtomicReference";
import type { IO } from "../Task";
import * as T from "../Task/_core";
import type { Ref } from "./model";
import { Atomic } from "./model";

/**
 * Creates a new `XRef` with the specified value.
 */
export function make<A>(a: A): IO<Ref<A>> {
  return T.total(() => new Atomic(new AtomicReference(a)));
}

/**
 * Creates a new `XRef` with the specified value.
 */
export function unsafeMake<A>(a: A): Ref<A> {
  return new Atomic(new AtomicReference(a));
}
