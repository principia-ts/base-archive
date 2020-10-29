import { AtomicReference } from "../../support";
import type { IO } from "../Task";
import * as T from "../Task/_core";
import type { Ref } from "./model";
import { Atomic } from "./model";

/**
 * Creates a new `XRef` with the specified value.
 */
export const makeRef = <A>(a: A): IO<Ref<A>> => T.total(() => new Atomic(new AtomicReference(a)));

/**
 * Creates a new `XRef` with the specified value.
 */
export const unsafeMakeRef = <A>(a: A): Ref<A> => new Atomic(new AtomicReference(a));
