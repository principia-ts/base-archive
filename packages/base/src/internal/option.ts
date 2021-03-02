import type { Option } from '../Option'

export type { Option }

export function Some<A>(a: A): Option<A> {
  return {
    _tag: 'Some',
    value: a
  }
}

export function None<A = never>(): Option<A> {
  return {
    _tag: 'None'
  }
}

export function getOrElse_<A, B>(fa: Option<A>, onNone: () => B): A | B {
  return fa._tag === 'Some' ? fa.value : onNone()
}

export function getOrElse<B>(onNone: () => B): <A>(fa: Option<A>) => A | B {
  return (fa) => getOrElse_(fa, onNone)
}
