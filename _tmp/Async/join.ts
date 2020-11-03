import { done } from "./constructors";
import { chain_ } from "./methods";
import type { Async } from "./model";
import type { AsyncDriver } from "./run";

export const join = <E, A>(driver: AsyncDriver<E, A>): Async<unknown, E, A> => chain_(driver.await, done);
