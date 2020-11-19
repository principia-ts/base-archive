import type { Eq } from "@principia/prelude/Eq";
import type { Monoid } from "@principia/prelude/Monoid";

export const MonoidLaws = {
  rightIdentity: <A>(M: Monoid<A>, E: Eq<A>) => (a: A): boolean => {
    return E.equals_(M.combine_(a, M.nat), a);
  },
  leftIdentity: <A>(M: Monoid<A>, E: Eq<A>) => (a: A): boolean => {
    return E.equals_(M.combine_(M.nat, a), a);
  }
};
