import type { DecodeError } from './DecodeError'
import type { Tree } from '@principia/base/data/Tree'
import type * as P from '@principia/base/typeclass'

import * as E from '@principia/base/data/Either'
import { identity, pipe, tuple } from '@principia/base/data/Function'
import { drawTree } from '@principia/base/data/Tree'
import * as HKT from '@principia/base/HKT'
import * as FS from '@principia/free/FreeSemigroup'

import { fold, info, leaf } from './DecodeError'

export interface ErrorInfo {
  name?: string
  id?: string
  message?: string
}

const showErrorInfo = (info: ErrorInfo): string =>
  info.name && info.message ? `${info.name}: ${info.message}` : info.name ?? info.message ?? ''

export type DecodeErrors = FS.FreeSemigroup<DecodeError<ErrorInfo>>

const isInfoPopulated = (info?: ErrorInfo): info is ErrorInfo => !!info?.id || !!info?.name || !!info?.message

export function error(actual: unknown, expected: string, errorInfo?: ErrorInfo): DecodeErrors {
  return isInfoPopulated(errorInfo)
    ? FS.combine(FS.element(leaf(actual, expected)), FS.element(info(errorInfo)))
    : FS.element(leaf(actual, expected))
}

export function success<A>(a: A): E.Either<DecodeErrors, A> {
  return E.right(a)
}

export function failure<A = never>(actual: unknown, expected: string, info?: ErrorInfo): E.Either<DecodeErrors, A> {
  return E.left(error(actual, expected, info))
}

const empty: ReadonlyArray<never> = []

const make = <A>(value: A, forest: ReadonlyArray<Tree<A>> = empty): Tree<A> => ({
  value,
  forest
})

const toTree: (e: DecodeError<ErrorInfo>) => Tree<string> = fold({
  Leaf: (input, expected) => make(`cannot decode ${JSON.stringify(input)}, should be ${expected}`, empty),
  Key: (key, kind, errors) => make(`${kind} property ${JSON.stringify(key)}`, toForest(errors)),
  Index: (index, kind, errors) => make(`${kind} index ${index}`, toForest(errors)),
  Member: (index, errors) => make(`member ${index}`, toForest(errors)),
  Lazy: (id, errors) => make(`lazy type ${id}`, toForest(errors)),
  Wrap: (error, errors) => make(showErrorInfo(error), toForest(errors)),
  Info: (error) => make(showErrorInfo(error))
})

export function toForest(e: DecodeErrors): ReadonlyArray<Tree<string>> {
  const stack = []
  let focus   = e
  const res   = []
  // eslint-disable-next-line no-constant-condition
  while (true) {
    switch (focus._tag) {
      case 'Element':
        res.push(toTree(focus.value))
        if (stack.length === 0) {
          return res
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          focus = stack.pop()!
        }
        break
      case 'Combine':
        stack.push(focus.right)
        focus = focus.left
        break
    }
  }
}

export function draw(e: DecodeErrors): string {
  return toForest(e)
    .map(drawTree({ show: identity }))
    .join('\n')
}

/*
 * -------------------------------------------
 * Validation Monad
 * -------------------------------------------
 */

export type V<C> = HKT.CleanParam<C, 'E'> & HKT.Fix<'E', DecodeErrors>

export function getDecodeErrorsValidation<M extends HKT.URIS, C = HKT.Auto>(
  M: P.MonadFail<M, C> & P.Bifunctor<M, C> & P.Fallible<M, C>
): P.MonadFail<M, V<C>> & P.Alt<M, V<C>> & P.Bifunctor<M, V<C>>
export function getDecodeErrorsValidation<M>(
  M: P.MonadFail<HKT.UHKT2<M>> & P.Bifunctor<HKT.UHKT2<M>> & P.Fallible<HKT.UHKT2<M>>
): P.MonadFail<HKT.UHKT2<M>, V<HKT.Auto>> & P.Alt<HKT.UHKT2<M>, V<HKT.Auto>> & P.Bifunctor<HKT.UHKT2<M>, HKT.Auto> {
  const map2_: P.Map2Fn_<HKT.UHKT2<M>, V<HKT.Auto>> = (fa, fb, f) =>
    M.flatten(
      M.map2_(M.recover(fa), M.recover(fb), (ea, eb) =>
        E.isLeft(ea)
          ? E.isLeft(eb)
            ? M.fail(FS.combine(ea.left, eb.left))
            : M.fail(ea.left)
          : E.isLeft(eb)
            ? M.fail(eb.left)
            : M.pure(f(ea.right, eb.right))
      )
    )

  const alt_: P.AltFn_<HKT.UHKT2<M>, V<HKT.Auto>> = (fa, that) =>
    pipe(
      M.recover(fa),
      M.flatMap(
        E.fold((e) => pipe(M.recover(that()), M.flatMap(E.fold((e1) => M.fail(FS.combine(e, e1)), M.pure))), M.pure)
      )
    )

  return HKT.instance<
    P.MonadFail<HKT.UHKT2<M>, V<HKT.Auto>> & P.Alt<HKT.UHKT2<M>, V<HKT.Auto>> & P.Bifunctor<HKT.UHKT2<M>, HKT.Auto>
  >({
    imap_: M.imap_,
    imap: M.imap,
    map_: M.map_,
    map: M.map,
    map2_,
    map2: (fb, f) => (fa) => map2_(fa, fb, f),
    product_: (fa, fb) => map2_(fa, fb, tuple),
    product: (fb) => (fa) => map2_(fa, fb, tuple),
    ap_: (fab, fa) => map2_(fab, fa, (f, a) => f(a)),
    ap: (fa) => (fab) => map2_(fab, fa, (f, a) => f(a)),
    mapLeft_: M.mapLeft_,
    mapLeft: M.mapLeft,
    bimap_: M.bimap_,
    bimap: M.bimap,
    flatMap_: M.flatMap_,
    flatMap: M.flatMap,
    flatten: M.flatten,
    fail: M.fail,
    alt_,
    alt: (that) => (me) => alt_(me, that),
    pure: M.pure,
    unit: M.unit
  })
}
