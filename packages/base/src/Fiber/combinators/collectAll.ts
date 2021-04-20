import type { Chunk } from '../../Chunk/core'
import type { Fiber } from '../core'

import { pipe } from '@principia/prelude/function'

import * as C from '../../Cause'
import * as Ch from '../../Chunk/core'
import * as Ex from '../../Exit'
import { None, Some } from '../../Option'
import * as O from '../../Option'
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
          Ch.foldr(Ex.succeed(Ch.empty<A>()) as Ex.Exit<E, Chunk<A>>, (a, b) =>
            Ex.crossWithCause_(a, b, (_a, _b) => Ch.prepend_(_b, _a), C.both)
          )
        )
      ),
    poll: pipe(
      I.foreach_(fibers, (f) => f.poll),
      I.map(
        Ch.foldr(Some(Ex.succeed(Ch.empty()) as Ex.Exit<E, Chunk<A>>), (a, b) =>
          O.match_(
            a,
            () => None(),
            (ra) =>
              O.match_(
                b,
                () => None(),
                (rb) => Some(Ex.crossWithCause_(ra, rb, (_a, _b) => Ch.prepend_(_b, _a), C.both))
              )
          )
        )
      )
    ),
    await: awaitAll(fibers)
  })
