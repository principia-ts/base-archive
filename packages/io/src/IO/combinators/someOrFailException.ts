import type { IO } from '../core'
import type { Option } from '@principia/base/data/Option'

import { NoSuchElementException } from '@principia/base/util/GlobalExceptions'

import { someOrFail_ } from './someOrFail'

export function someOrFailException<R, E, A>(ma: IO<R, E, Option<A>>): IO<R, E | NoSuchElementException, A> {
  return someOrFail_(ma, () => new NoSuchElementException('IO.someOrFailException'))
}
