import type { FIO } from '../core'
import type { Option } from '@principia/base/data/Option'

import * as O from '@principia/base/data/Option'
import { NoSuchElementException } from '@principia/base/util/GlobalExceptions'

import { fail, succeed } from '../core'

export function getOrFail<A>(v: Option<A>): FIO<NoSuchElementException, A> {
  return O.fold_(v, () => fail(new NoSuchElementException('IO.getOrFail')), succeed)
}

export function getOrFailUnit<A>(v: Option<A>): FIO<void, A> {
  return O.fold_(v, () => fail(undefined), succeed)
}
