import type { Eq } from "@principia/prelude/Eq";

import { empty } from "./constructors";
import { filter_ } from "./filterable";
import { elem, elem_ } from "./guards";

/**
 * Form the union of two sets
 *
 * @category Combinators
 * @since 1.0.0
 */
export function union_<A>(E: Eq<A>) {
  const elemE = elem(E);
  return (me: ReadonlySet<A>, that: ReadonlySet<A>) => {
    if (me.size === 0) {
      return that;
    }
    if (that.size === 0) {
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
}

/**
 * Form the union of two sets
 *
 * @category Combinators
 * @since 1.0.0
 */
export function union<A>(E: Eq<A>) {
  const unionE_ = union_(E);
  return (that: ReadonlySet<A>) => (me: ReadonlySet<A>) => unionE_(me, that);
}

/**
 * The set of elements which are in both the first and second set
 *
 * @category Combinators
 * @since 1.0.0
 */
export function intersection_<A>(
  E: Eq<A>
): (me: ReadonlySet<A>, that: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem(E);
  return (me, that) => {
    if (me.size === 0 || that.size === 0) {
      return empty<A>();
    }
    const r = new Set<A>();
    me.forEach((e) => {
      if (elemE(e)(that)) {
        r.add(e);
      }
    });
    return r;
  };
}

/**
 * The set of elements which are in both the first and second set
 *
 * @category Combinators
 * @since 1.0.0
 */
export function intersection<A>(E: Eq<A>) {
  const intersectionE_ = intersection_(E);
  return (that: ReadonlySet<A>) => (me: ReadonlySet<A>) => intersectionE_(me, that);
}

export function difference_<A>(E: Eq<A>) {
  const elemE_ = elem_(E);
  return (me: ReadonlySet<A>, that: ReadonlySet<A>) => filter_(me, (a) => !elemE_(that, a));
}

export function difference<A>(E: Eq<A>) {
  const differenceE_ = difference_(E);
  return (that: ReadonlySet<A>) => (me: ReadonlySet<A>) => differenceE_(me, that);
}

export function insert_<A>(E: Eq<A>) {
  const elemE_ = elem_(E);
  return (set: ReadonlySet<A>, a: A) => {
    if (!elemE_(set, a)) {
      const r = new Set(set);
      r.add(a);
      return r;
    } else {
      return set;
    }
  };
}

export function insert<A>(E: Eq<A>) {
  const insertE_ = insert_(E);
  return (a: A) => (set: ReadonlySet<A>) => insertE_(set, a);
}

export function remove_<A>(E: Eq<A>): (set: ReadonlySet<A>, a: A) => ReadonlySet<A> {
  return (set, a) => filter_(set, (ax) => !E.equals(a)(ax));
}

export function remove<A>(E: Eq<A>): (a: A) => (set: ReadonlySet<A>) => ReadonlySet<A> {
  return (a) => (set) => remove_(E)(set, a);
}
