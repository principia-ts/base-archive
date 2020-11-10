import { fail } from "../constructors";
import type { Managed } from "../model";
import { orElse_ } from "./orElse";

export const orElseFail_ = <R, E, A, E1>(ma: Managed<R, E, A>, e: E1): Managed<R, E | E1, A> =>
   orElse_(ma, () => fail(e));

export const orElseFail = <E1>(e: E1) => <R, E, A>(ma: Managed<R, E, A>): Managed<R, E | E1, A> => orElseFail_(ma, e);
