import * as T from "../core";
import type { Task } from "../model";

export const mapPartial_ = <R, E, A, E1, B>(
   task: Task<R, E, A>,
   f: (a: A) => B,
   onThrow: (u: unknown) => E1
): Task<R, E | E1, B> => T.chain_(task, (a) => T.partial_(() => f(a), onThrow));

export const mapPartial = <E1>(onThrow: (u: unknown) => E1) => <A, B>(f: (a: A) => B) => <R, E>(
   task: Task<R, E, A>
): Task<R, E | E1, B> => mapPartial_(task, f, onThrow);
