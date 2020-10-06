import * as A from "../Array";
import type { Either } from "../Either";
import type { Eq } from "../Eq";
import { identity, Predicate, Refinement } from "../Function";
import type { Maybe } from "../Maybe";
import type { Monoid } from "../Monoid";
import type { Ord } from "../Ord";
import type * as TC from "../typeclass-index";
import type { Separated } from "../Utils";
import { toArray } from "./destructors";
import type { URI, V } from "./Set";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

/**
 * Test if a value is a member of a set
 *
 * @since 1.0.0
 */
export const _elem = <A>(E: Eq<A>) => (set: ReadonlySet<A>, a: A): boolean => {
   const values = set.values();
   let e: Next<A>;
   let found = false;
   while (!found && !(e = values.next()).done) {
      found = E.equals(a)(e.value);
   }
   return found;
};

/**
 * Test if a value is a member of a set
 *
 * @since 1.0.0
 */
export const elem = <A>(E: Eq<A>) => (a: A) => (set: ReadonlySet<A>): boolean => _elem(E)(set, a);

export const _map = <B>(E: Eq<B>) => <A>(set: ReadonlySet<A>, f: (a: A) => B) => {
   const elemE = elem(E);
   const r = new Set<B>();
   set.forEach((e) => {
      const v = f(e);
      if (!elemE(v)(r)) {
         r.add(v);
      }
   });
   return r;
};

export const map = <B>(E: Eq<B>) => <A>(f: (a: A) => B) => (set: ReadonlySet<A>) => _map(E)(set, f);

export const _bind = <B>(E: Eq<B>): (<A>(set: ReadonlySet<A>, f: (a: A) => ReadonlySet<B>) => ReadonlySet<B>) => {
   const elemE = elem(E);
   return (set, f) => {
      const r = new Set<B>();
      set.forEach((e) => {
         f(e).forEach((e) => {
            if (!elemE(e)(r)) {
               r.add(e);
            }
         });
      });
      return r;
   };
};

export const bind = <B>(E: Eq<B>) => <A>(set: ReadonlySet<A>) => (f: (a: A) => ReadonlySet<B>): ReadonlySet<B> =>
   _bind(E)(set, f);

export const chain = <B>(E: Eq<B>) => <A>(f: (a: A) => ReadonlySet<B>) => (set: ReadonlySet<A>) => _bind(E)(set, f);

export const _filter: {
   <A, B extends A>(fa: ReadonlySet<A>, refinement: Refinement<A, B>): ReadonlySet<B>;
   <A>(fa: ReadonlySet<A>, predicate: Predicate<A>): ReadonlySet<A>;
} = <A>(fa: ReadonlySet<A>, predicate: Predicate<A>) => {
   const values = fa.values();
   let e: Next<A>;
   const r = new Set<A>();
   while (!(e = values.next()).done) {
      const value = e.value;
      if (predicate(value)) {
         r.add(value);
      }
   }
   return r;
};

export const filter: {
   <A, B extends A>(refinement: Refinement<A, B>): (fa: ReadonlySet<A>) => ReadonlySet<B>;
   <A>(predicate: Predicate<A>): (fa: ReadonlySet<A>) => ReadonlySet<A>;
} = <A>(predicate: Predicate<A>) => (fa: ReadonlySet<A>) => _filter(fa, predicate);

export const _partition: {
   <A, B extends A>(fa: ReadonlySet<A>, refinement: Refinement<A, B>): Separated<ReadonlySet<A>, ReadonlySet<B>>;
   <A>(fa: ReadonlySet<A>, predicate: Predicate<A>): Separated<ReadonlySet<A>, ReadonlySet<A>>;
} = <A>(fa: ReadonlySet<A>, predicate: Predicate<A>) => {
   const values = fa.values();
   let e: Next<A>;
   const right = new Set<A>();
   const left = new Set<A>();
   while (!(e = values.next()).done) {
      const value = e.value;
      if (predicate(value)) {
         right.add(value);
      } else {
         left.add(value);
      }
   }
   return { left, right };
};

export const partition: {
   <A, B extends A>(refinement: Refinement<A, B>): (fa: ReadonlySet<A>) => Separated<ReadonlySet<A>, ReadonlySet<B>>;
   <A>(predicate: Predicate<A>): (fa: ReadonlySet<A>) => Separated<ReadonlySet<A>, ReadonlySet<A>>;
} = <A>(predicate: Predicate<A>) => (fa: ReadonlySet<A>) => _partition(fa, predicate);

/**
 * @since 1.0.0
 */
export const _mapEither = <B, C>(EB: Eq<B>, EC: Eq<C>) => <A>(
   set: ReadonlySet<A>,
   f: (a: A) => Either<B, C>
): Separated<ReadonlySet<B>, ReadonlySet<C>> => {
   const values = set.values();
   let e: Next<A>;
   const left = new Set<B>();
   const right = new Set<C>();
   const hasB = elem(EB);
   const hasC = elem(EC);
   while (!(e = values.next()).done) {
      const v = f(e.value);
      switch (v._tag) {
         case "Left":
            if (!hasB(v.left)(left)) {
               left.add(v.left);
            }
            break;
         case "Right":
            if (!hasC(v.right)(right)) {
               right.add(v.right);
            }
            break;
      }
   }
   return { left, right };
};

/**
 * @since 1.0.0
 */
export const mapEither = <B, C>(EB: Eq<B>, EC: Eq<C>) => <A>(f: (a: A) => Either<B, C>) => (set: ReadonlySet<A>) =>
   _mapEither(EB, EC)(set, f);

export const _reduce = <A>(O: Ord<A>) => {
   const toArrayO = toArray(O);
   return <B>(set: ReadonlySet<A>, b: B, f: (b: B, a: A) => B): B => A._reduce(toArrayO(set), b, f);
};

export const reduce = <A>(O: Ord<A>) => <B>(b: B, f: (b: B, a: A) => B) => (set: ReadonlySet<A>) =>
   _reduce(O)(set, b, f);

export const _foldMap = <A, M>(O: Ord<A>, M: Monoid<M>) => {
   const toArrayO = toArray(O);
   return (fa: ReadonlySet<A>, f: (a: A) => M) => A._reduce(toArrayO(fa), M.empty, (b, a) => M.concat(b)(f(a)));
};

export const foldMap = <A, M>(O: Ord<A>, M: Monoid<M>) => {
   const _foldMapOM = _foldMap(O, M);
   return (f: (a: A) => M) => (fa: ReadonlySet<A>) => _foldMapOM(fa, f);
};

export const _mapMaybe = <B>(E: Eq<B>) => {
   const _elemE = _elem(E);
   return <A>(fa: ReadonlySet<A>, f: (a: A) => Maybe<B>) => {
      const r: Set<B> = new Set();
      fa.forEach((a) => {
         const ob = f(a);
         if (ob._tag === "Just" && !_elemE(r, ob.value)) {
            r.add(ob.value);
         }
      });
      return r;
   };
};

export const mapMaybe = <B>(E: Eq<B>) => {
   const _filterMapE = _mapMaybe(E);
   return <A>(f: (a: A) => Maybe<B>) => (fa: ReadonlySet<A>) => _filterMapE(fa, f);
};

export const compact = <A>(E: Eq<A>): ((fa: ReadonlySet<Maybe<A>>) => ReadonlySet<A>) => mapMaybe(E)(identity);

export const separate = <E, A>(EE: Eq<E>, EA: Eq<A>) => (
   fa: ReadonlySet<Either<E, A>>
): Separated<ReadonlySet<E>, ReadonlySet<A>> => {
   const elemEE = elem(EE);
   const elemEA = elem(EA);
   const left: Set<E> = new Set();
   const right: Set<A> = new Set();
   fa.forEach((e) => {
      switch (e._tag) {
         case "Left":
            if (!elemEE(e.left)(left)) {
               left.add(e.left);
            }
            break;
         case "Right":
            if (!elemEA(e.right)(right)) {
               right.add(e.right);
            }
            break;
      }
   });
   return { left, right };
};
