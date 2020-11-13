import type { Either } from "../../Either";
import type { Option } from "../../Option";
import type { FiberId } from "../Fiber/FiberId";
import type { Cause } from "./Cause";
import * as C from "./Cause";
import type { Exit } from "./model";

export function succeed<E = never, A = never>(value: A): Exit<E, A> {
   return {
      _tag: "Success",
      value
   };
}

export function failure<E = never, A = never>(cause: Cause<E>): Exit<E, A> {
   return {
      _tag: "Failure",
      cause
   };
}

export function fail<E = never, A = never>(e: E): Exit<E, A> {
   return failure(C.fail(e));
}

export function interrupt(id: FiberId) {
   return failure(C.interrupt(id));
}

export function die(error: unknown): Exit<unknown, never> {
   return failure(C.die(error));
}

export function fromEither<E, A>(e: Either<E, A>): Exit<E, A> {
   return e._tag === "Left" ? fail(e.left) : succeed(e.right);
}

export function fromOption_<E, A>(fa: Option<A>, onNone: () => E): Exit<E, A> {
   return fa._tag === "None" ? fail(onNone()) : succeed(fa.value);
}

export function fromOption<E>(onNone: () => E): <A>(fa: Option<A>) => Exit<E, A> {
   return (fa) => fromOption_(fa, onNone);
}
