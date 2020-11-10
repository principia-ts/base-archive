import * as C from "./Cause";
import { failure, succeed } from "./constructors";
import { map_ } from "./functor";
import type { Exit } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Apply Exit
 * -------------------------------------------
 */

export const ap_ = <E, A, G, B>(fab: Exit<G, (a: A) => B>, fa: Exit<E, A>): Exit<E | G, B> =>
   chain_(fab, (f) => map_(fa, (a) => f(a)));

export const ap = <E, A>(fa: Exit<E, A>) => <G, B>(fab: Exit<G, (a: A) => B>): Exit<E | G, B> => ap_(fab, fa);

export const apFirst_ = <E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, A> =>
   mapBothCause_(fa, fb, (a, _) => a, C.then);

export const apFirst = <G, B>(fb: Exit<G, B>) => <E, A>(fa: Exit<E, A>): Exit<E | G, A> => apFirst_(fa, fb);

export const apSecond_ = <E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, B> =>
   mapBothCause_(fa, fb, (_, b) => b, C.then);

export const apSecond = <G, B>(fb: Exit<G, B>) => <E, A>(fa: Exit<E, A>): Exit<E | G, B> => apSecond_(fa, fb);

export const mapBothCause_ = <E, A, G, B, C>(
   fa: Exit<E, A>,
   fb: Exit<G, B>,
   f: (a: A, b: B) => C,
   g: (ea: C.Cause<E>, eb: C.Cause<G>) => C.Cause<E | G>
): Exit<E | G, C> => {
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
};

export const mapBothCause = <E, A, G, B, C>(
   fb: Exit<G, B>,
   f: (a: A, b: B) => C,
   g: (ea: C.Cause<E>, eb: C.Cause<G>) => C.Cause<E | G>
) => (fa: Exit<E, A>): Exit<E | G, C> => mapBothCause_(fa, fb, f, g);

export const mapBoth_ = <EA, A, EB, B, C>(fa: Exit<EA, A>, fb: Exit<EB, B>, f: (a: A, b: B) => C): Exit<EA | EB, C> =>
   mapBothCause_(fa, fb, f, C.then);

export const mapBoth = <A, G, B, C>(fb: Exit<G, B>, f: (a: A, b: B) => C) => <E>(fa: Exit<E, A>): Exit<E | G, C> =>
   mapBoth_(fa, fb, f);

export const apParFirst_ = <E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, A> =>
   mapBothCause_(fa, fb, (a, _) => a, C.both);

export const apParFirst = <G, B>(fb: Exit<G, B>) => <E, A>(fa: Exit<E, A>): Exit<E | G, A> => apParFirst_(fa, fb);

export const apParSecond_ = <E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, B> =>
   mapBothCause_(fa, fb, (_, b) => b, C.both);

export const apParSecond = <G, B>(fb: Exit<G, B>) => <E, A>(fa: Exit<E, A>): Exit<E | G, B> => apParSecond_(fa, fb);
