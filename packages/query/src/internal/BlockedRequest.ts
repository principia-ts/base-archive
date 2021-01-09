import type { Request } from '../Request'
import type { Either } from '@principia/base/Either'
import type { Option } from '@principia/base/Option'
import type { _A, _E } from '@principia/base/util/types'
import type { URef } from '@principia/io/IORef'

export abstract class BlockedRequest<A> {
  readonly _tag = 'BlockedRequest'

  abstract readonly request: Request<_E<A>, _A<A>>
  abstract readonly result: URef<Option<Either<_E<A>, _A<A>>>>
  static apply<E, A extends Request<E, B>, B>(request0: A, result0: URef<Option<Either<E, B>>>): BlockedRequest<A> {
    return new (class extends BlockedRequest<A> {
      request = request0 as any
      result  = result0 as any
    })()
  }
}
