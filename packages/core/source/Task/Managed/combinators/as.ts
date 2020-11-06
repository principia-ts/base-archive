import * as O from "../../../Option";
import { mapError_ } from "../bifunctor";
import { map_ } from "../functor";
import type { Managed } from "../model";

export const as_ = <R, E, A, B>(ma: Managed<R, E, A>, b: B): Managed<R, E, B> => map_(ma, () => b);

export const as = <B>(b: B) => <R, E, A>(ma: Managed<R, E, A>): Managed<R, E, B> => as_(ma, b);

export const asSome = <R, E, A>(ma: Managed<R, E, A>): Managed<R, E, O.Option<A>> => map_(ma, O.some);

export const asSomeError = <R, E, A>(ma: Managed<R, E, A>): Managed<R, O.Option<E>, A> => mapError_(ma, O.some);
