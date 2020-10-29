import type { Either } from "../../Either";
import type { Option } from "../../Option";
import type { FiberId } from "../Fiber/FiberId";
import type { Cause } from "./Cause";
import * as C from "./Cause";
import type { Exit } from "./model";

export const succeed = <E = never, A = never>(value: A): Exit<E, A> => ({
   _tag: "Success",
   value
});

export const failure = <E = never, A = never>(cause: Cause<E>): Exit<E, A> => ({
   _tag: "Failure",
   cause
});

export const fail = <E = never, A = never>(e: E): Exit<E, A> => failure(C.fail(e));

export const interrupt = (id: FiberId) => failure(C.interrupt(id));

export const die = (error: unknown): Exit<unknown, never> => failure(C.die(error));

export const fromEither = <E, A>(e: Either<E, A>): Exit<E, A> => (e._tag === "Left" ? fail(e.left) : succeed(e.right));

export const fromOption_ = <E, A>(fa: Option<A>, onNone: () => E): Exit<E, A> =>
   fa._tag === "None" ? fail(onNone()) : succeed(fa.value);

export const fromOption = <E>(onNone: () => E) => <A>(fa: Option<A>): Exit<E, A> => fromOption_(fa, onNone);
