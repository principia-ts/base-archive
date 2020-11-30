import * as C from "../Cause";
import { failure, succeed } from "./constructors";
import { map_ } from "./functor";
import type { Exit } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Apply Exit
 * -------------------------------------------
 */

export function ap_<E, A, G, B>(fab: Exit<G, (a: A) => B>, fa: Exit<E, A>): Exit<E | G, B> {
  return chain_(fab, (f) => map_(fa, (a) => f(a)));
}

export function ap<E, A>(fa: Exit<E, A>): <G, B>(fab: Exit<G, (a: A) => B>) => Exit<E | G, B> {
  return (fab) => ap_(fab, fa);
}

export function apFirst_<E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, A> {
  return zipWithCause_(fa, fb, (a, _) => a, C.then);
}

export function apFirst<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, A> {
  return (fa) => apFirst_(fa, fb);
}

export function apSecond_<E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, B> {
  return zipWithCause_(fa, fb, (_, b) => b, C.then);
}

export function apSecond<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, B> {
  return (fa) => apSecond_(fa, fb);
}

export function zipWithCause_<E, A, G, B, C>(
  fa: Exit<E, A>,
  fb: Exit<G, B>,
  f: (a: A, b: B) => C,
  g: (ea: C.Cause<E>, eb: C.Cause<G>) => C.Cause<E | G>
): Exit<E | G, C> {
  switch (fa._tag) {
    case "Failure": {
      switch (fb._tag) {
        case "Success": {
          return fa;
        }
        case "Failure": {
          return failure(g(fa.cause, fb.cause));
        }
      }
    }
    // eslint-disable-next-line no-fallthrough
    case "Success": {
      switch (fb._tag) {
        case "Success": {
          return succeed(f(fa.value, fb.value));
        }
        case "Failure": {
          return fb;
        }
      }
    }
  }
}

export function zipWithCause<E, A, G, B, C>(
  fb: Exit<G, B>,
  f: (a: A, b: B) => C,
  g: (ea: C.Cause<E>, eb: C.Cause<G>) => C.Cause<E | G>
): (fa: Exit<E, A>) => Exit<E | G, C> {
  return (fa) => zipWithCause_(fa, fb, f, g);
}

export function zipWith_<EA, A, EB, B, C>(
  fa: Exit<EA, A>,
  fb: Exit<EB, B>,
  f: (a: A, b: B) => C
): Exit<EA | EB, C> {
  return zipWithCause_(fa, fb, f, C.then);
}

export function zipWith<A, G, B, C>(
  fb: Exit<G, B>,
  f: (a: A, b: B) => C
): <E>(fa: Exit<E, A>) => Exit<G | E, C> {
  return (fa) => zipWith_(fa, fb, f);
}

export function apParFirst_<E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, A> {
  return zipWithCause_(fa, fb, (a, _) => a, C.both);
}

export function apParFirst<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, A> {
  return (fa) => apParFirst_(fa, fb);
}

export function apParSecond_<E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, B> {
  return zipWithCause_(fa, fb, (_, b) => b, C.both);
}

export function apParSecond<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, B> {
  return (fa) => apParSecond_(fa, fb);
}
