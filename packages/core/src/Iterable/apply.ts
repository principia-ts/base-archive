import { genOf } from "./constructors";
import { map_ } from "./functor";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Apply Iterable
 * -------------------------------------------
 */

export const zipWith_ = <A, B, C>(fa: Iterable<A>, fb: Iterable<B>, f: (a: A, b: B) => C): Iterable<C> => ({
   [Symbol.iterator]() {
      let done = false;
      const ia = fa[Symbol.iterator]();
      const ib = fb[Symbol.iterator]();
      return {
         next() {
            if (done) {
               // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
               return this.return!();
            }

            const va = ia.next();
            const vb = ib.next();

            return va.done || vb.done
               ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                 this.return!()
               : { done: false, value: f(va.value, vb.value) };
         },
         return(value?: unknown) {
            if (!done) {
               done = true;

               if (typeof ia.return === "function") {
                  ia.return();
               }
               if (typeof ib.return === "function") {
                  ib.return();
               }
            }

            return { done: true, value };
         }
      };
   }
});

export const zipWith = <A, B, C>(fb: Iterable<B>, f: (a: A, b: B) => C) => (fa: Iterable<A>) => zipWith_(fa, fb, f);

export const ap_ = <A, B>(fab: Iterable<(a: A) => B>, fa: Iterable<A>): Iterable<B> => chain_(fab, (f) => map_(fa, f));

export const ap = <A>(fa: Iterable<A>) => <B>(fab: Iterable<(a: A) => B>): Iterable<B> => ap_(fab, fa);

export const pure = <A>(a: A): Iterable<A> => ({
   [Symbol.iterator]: () => genOf(a)
});
