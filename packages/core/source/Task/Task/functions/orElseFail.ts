import { fail } from "../core";
import type { Task } from "../model";
import { orElse_ } from "./orElse";

export const orElseFail_ = <R, E, A, E1>(ma: Task<R, E, A>, e: E1): Task<R, E1, A> => orElse_(ma, () => fail(e));

export const orElseFail = <E1>(e: E1) => <R, E, A>(fa: Task<R, E, A>): Task<R, E1, A> => orElseFail_(fa, e);
