import { Eq } from "../Eq";
import { not, Predicate } from "../Function";
import { empty } from "./constructors";
import { _elem, _filter, elem } from "./methods";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

export const _some = <A>(set: ReadonlySet<A>, predicate: Predicate<A>) => {
   const values = set.values();
   let e: Next<A>;
   let found = false;
   while (!found && !(e = values.next()).done) {
      found = predicate(e.value);
   }
   return found;
};

export const some = <A>(predicate: Predicate<A>) => (set: ReadonlySet<A>) => _some(set, predicate);

export const _every = <A>(set: ReadonlySet<A>, predicate: Predicate<A>) =>
   not(some(not(predicate)))(set);

export const every = <A>(predicate: Predicate<A>) => (set: ReadonlySet<A>) =>
   _every(set, predicate);

/**
 * Form the union of two sets
 *
 * @category Combinators
 * @since 1.0.0
 */
export const _union = <A>(E: Eq<A>) => {
   const elemE = elem(E);
   return (me: ReadonlySet<A>, that: ReadonlySet<A>) => {
      if (me === empty) {
         return that;
      }
      if (that === empty) {
         return me;
      }
      const r = new Set(me);
      that.forEach((e) => {
         if (!elemE(e)(r)) {
            r.add(e);
         }
      });
      return r;
   };
};

/**
 * Form the union of two sets
 *
 * @category Combinators
 * @since 1.0.0
 */
export const union = <A>(E: Eq<A>) => {
   const _unionE = _union(E);
   return (that: ReadonlySet<A>) => (me: ReadonlySet<A>) => _unionE(me, that);
};

/**
 * The set of elements which are in both the first and second set
 *
 * @category Combinators
 * @since 1.0.0
 */
export const _intersection = <A>(E: Eq<A>) => {
   const elemE = elem(E);
   return (me: ReadonlySet<A>, that: ReadonlySet<A>) => {
      if (me === empty || that === empty) {
         return empty;
      }
      const r = new Set<A>();
      me.forEach((e) => {
         if (elemE(e)(that)) {
            r.add(e);
         }
      });
      return r;
   };
};

/**
 * The set of elements which are in both the first and second set
 *
 * @category Combinators
 * @since 1.0.0
 */
export const intersection = <A>(E: Eq<A>) => {
   const _intersectionE = _intersection(E);
   return (that: ReadonlySet<A>) => (me: ReadonlySet<A>) => _intersectionE(me, that);
};

export const _difference = <A>(E: Eq<A>) => {
   const _elemE = _elem(E);
   return (me: ReadonlySet<A>, that: ReadonlySet<A>) => _filter(me, (a) => !_elemE(that, a));
};

export const difference = <A>(E: Eq<A>) => {
   const _differenceE = _difference(E);
   return (that: ReadonlySet<A>) => (me: ReadonlySet<A>) => _differenceE(me, that);
};

export const _insert = <A>(E: Eq<A>) => {
   const _elemE = _elem(E);
   return (set: ReadonlySet<A>, a: A) => {
      if (!_elemE(set, a)) {
         const r = new Set(set);
         r.add(a);
         return r;
      } else {
         return set;
      }
   };
};

export const insert = <A>(E: Eq<A>) => {
   const _insertE = _insert(E);
   return (a: A) => (set: ReadonlySet<A>) => _insertE(set, a);
};

export const _remove = <A>(E: Eq<A>) => (set: ReadonlySet<A>, a: A) =>
   _filter(set, (ax) => !E.equals(a)(ax));

export const remove = <A>(E: Eq<A>) => (a: A) => (set: ReadonlySet<A>) => _remove(E)(set, a);
