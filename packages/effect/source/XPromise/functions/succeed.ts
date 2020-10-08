import * as T from "../../Effect/core";
import type { XPromise } from "../XPromise";
import { completeWith } from "./completeWith";

/**
 * Completes the promise with the specified value.
 */
export const succeed = <A>(a: A) => <E>(promise: XPromise<E, A>) => completeWith<E, A>(T.pure(a))(promise);

/**
 * Completes the promise with the specified value.
 */
export const succeed_ = <A, E>(promise: XPromise<E, A>, a: A) => completeWith<E, A>(T.pure(a))(promise);
