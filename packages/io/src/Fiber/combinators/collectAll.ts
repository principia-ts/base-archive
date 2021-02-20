import type { Fiber } from '../core'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'
import { None, Some } from '@principia/base/Option'
import * as O from '@principia/base/Option'

import * as C from '../../Cause'
import * as Ex from '../../Exit'
import { makeSynthetic } from '../core'
import * as I from '../internal/io'
import { awaitAll } from './awaitAll'

/**
 * Collects all fibers into a single fiber producing an in-order list of the
 * results.
 */
export const collectAll = <E, A>(fibers: Iterable<Fiber<E, A>>) =>
  makeSynthetic({
    _tag: 'SyntheticFiber',
    getRef: (ref) =>
      I.foldl_(fibers, ref.initial, (a, fiber) =>
        pipe(
          fiber.getRef(ref),
          I.map((a2) => ref.join(a, a2))
        )
      ),
    inheritRefs: I.foreachUnit_(fibers, (f) => f.inheritRefs),
    interruptAs: (fiberId) =>
      pipe(
        I.foreach_(fibers, (f) => f.interruptAs(fiberId)),
        I.map(
          A.foldr(Ex.succeed(A.empty) as Ex.Exit<E, ReadonlyArray<A>>, (a, b) =>
            Ex.crossWithCause_(a, b, (_a, _b) => [_a, ..._b], C.both)
          )
        )
      ),
    poll: pipe(
      I.foreach_(fibers, (f) => f.poll),
      I.map(
        A.foldr(Some(Ex.succeed(A.empty) as Ex.Exit<E, readonly A[]>), (a, b) =>
          O.match_(
            a,
            () => None(),
            (ra) =>
              O.match_(
                b,
                () => None(),
                (rb) => Some(Ex.crossWithCause_(ra, rb, (_a, _b) => [_a, ..._b], C.both))
              )
          )
        )
      )
    ),
    await: awaitAll(fibers)
  })
