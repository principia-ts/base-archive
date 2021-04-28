import type * as P from '@principia/prelude'

/*
 * -------------------------------------------
 * utils
 * -------------------------------------------
 */

export function gcd_<A>(E: P.Eq<A>, F: P.Field<A>): (x: A, y: A) => A {
  const zero = F.zero
  return (x, y) => {
    let _x = x
    let _y = y
    while (!E.equals_(_y, zero)) {
      const mod = F.mod_(_x, _y)
      _x        = _y
      _y        = mod
    }
    return _x
  }
}

export function gcd<A>(E: P.Eq<A>, F: P.Field<A>): (y: A) => (x: A) => A {
  const gcdEF_ = gcd_(E, F)
  return (y) => (x) => gcdEF_(x, y)
}

export function lcm_<A>(E: P.Eq<A>, F: P.Field<A>): (x: A, y: A) => A {
  const zero   = F.zero
  const gcdEF_ = gcd_(E, F)
  return (x, y) => (E.equals_(x, zero) || E.equals_(y, zero) ? zero : F.div_(F.mul_(x, y), gcdEF_(x, y)))
}

export function lcm<A>(E: P.Eq<A>, F: P.Field<A>): (y: A) => (x: A) => A {
  const lcmEF_ = lcm_(E, F)
  return (y) => (x) => lcmEF_(x, y)
}

export * from '@principia/prelude/Field'
