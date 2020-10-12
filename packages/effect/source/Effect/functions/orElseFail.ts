import { fail } from "../core";
import type { Effect } from "../Effect";
import { orElse_ } from "./orElse";

export const orElseFail_ = <R, E, A, E1>(ma: Effect<R, E, A>, e: E1): Effect<R, E1, A> => orElse_(ma, () => fail(e));

export const orElseFail = <E1>(e: E1) => <R, E, A>(fa: Effect<R, E, A>): Effect<R, E1, A> => orElseFail_(fa, e);
