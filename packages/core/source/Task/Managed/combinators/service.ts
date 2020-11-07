import { flow } from "@principia/prelude";

import type * as T from "../_internal/task";
import type { Has, Tag } from "../../../Has";
import type { Managed } from "../model";
import { asks, asksM, asksManaged } from "../reader";

export const askService = <T>(t: Tag<T>): Managed<Has<T>, never, T> => asks(t.read);

export const asksService = <T>(t: Tag<T>) => <A>(f: (a: T) => A): Managed<Has<T>, never, A> => asks(flow(t.read, f));

export const asksServiceM = <T>(t: Tag<T>) => <R, E, A>(f: (a: T) => T.Task<R, E, A>): Managed<Has<T> & R, E, A> =>
   asksM(flow(t.read, f));

export const asksServiceManaged = <T>(t: Tag<T>) => <R, E, A>(
   f: (a: T) => Managed<R, E, A>
): Managed<Has<T> & R, E, A> => asksManaged(flow(t.read, f));
