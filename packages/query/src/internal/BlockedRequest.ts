import type { Request } from '../Request'
import type { Either } from '@principia/base/Either'
import type { Option } from '@principia/base/Option'
import type { _A, _E } from '@principia/base/util/types'
import type { URef } from '@principia/io/IORef'

export interface BlockedRequest<A> {
  readonly _tag: 'BlockedRequest'
  readonly request: Request<_E<A>, _A<A>>
  readonly result: URef<Option<Either<_E<A>, _A<A>>>>
}

export function make<E, A extends Request<E, B>, B>(
  request0: A,
  result0: URef<Option<Either<E, B>>>
): BlockedRequest<A> {
  return {
    _tag: 'BlockedRequest',
    request: request0 as any,
    result: result0 as any
  }
}
