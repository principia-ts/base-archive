import type { DecodeError } from './DecodeError'
import type { MonadDecoder } from './DecoderK'
import type { Tree } from '@principia/base/data/Tree'
import type * as P from '@principia/base/typeclass'

import * as Eval from '@principia/base/control/Eval'
import * as A from '@principia/base/data/Array'
import * as E from '@principia/base/data/Either'
import { identity, pipe, tuple } from '@principia/base/data/Function'
import * as T from '@principia/base/data/Tree'
import * as HKT from '@principia/base/HKT'
import * as FS from '@principia/free/FreeSemigroup'

import { fold, info, leaf } from './DecodeError'

export type DecodeErrors = FS.FreeSemigroup<DecodeError<ErrorInfo>>

export interface ErrorInfo {
  name?: string
  id?: string
  message?: string
}

const showErrorInfo = (info: ErrorInfo): string =>
  info.name && info.message ? `${info.name}: ${info.message}` : info.name ?? info.message ?? ''

const isInfoPopulated = (info?: ErrorInfo): info is ErrorInfo => !!info?.id || !!info?.name || !!info?.message

export function error(actual: unknown, expected: string, errorInfo?: ErrorInfo): DecodeErrors {
  return isInfoPopulated(errorInfo)
    ? FS.combine(FS.element(leaf(actual, expected)), FS.element(info(errorInfo)))
    : FS.element(leaf(actual, expected))
}

const toTree: (e: DecodeError<ErrorInfo>) => Tree<string> = fold({
  Leaf: (input, expected) => T.make(`cannot decode ${JSON.stringify(input)}, should be ${expected}`, A.empty()),
  Key: (key, kind, errors) => T.make(`${kind} property ${JSON.stringify(key)}`, toForest(errors)),
  Index: (index, kind, errors) => T.make(`${kind} index ${index}`, toForest(errors)),
  Member: (index, errors) => T.make(`member ${index}`, toForest(errors)),
  Lazy: (id, errors) => T.make(`lazy type ${id}`, toForest(errors)),
  Wrap: (error, errors) => T.make(showErrorInfo(error), toForest(errors)),
  Info: (error) => T.make(showErrorInfo(error), A.empty())
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

export function prettyPrint(e: DecodeErrors): string {
  return toForest(e)
    .map(T.drawTree({ show: identity }))
    .join('\n')
}

export function paths(e: DecodeErrors): Record<string, any> {
  const go = (e: DecodeErrors): Eval.Eval<Record<string, any>> =>
    Eval.gen(function* (_) {
      switch (e._tag) {
        case 'Combine': {
          const l = yield* _(go(e.left))
          const r = yield* _(go(e.right))
          return { ...l, ...r }
        }
        case 'Element': {
          const el = e.value
          switch (el._tag) {
            case 'Info': {
              return {}
            }
            case 'Wrap': {
              return yield* _(go(el.errors))
            }
            case 'Lazy': {
              return yield* _(go(el.errors))
            }
            case 'Member': {
              return yield* _(go(el.errors))
            }
            case 'Key': {
              return { [el.key]: yield* _(go(el.errors)) }
            }
            case 'Leaf': {
              return { expected: el.expected, actual: el.actual }
            }
            case 'Index': {
              return { [el.index]: yield* _(go(el.errors)) }
            }
          }
        }
      }
    })
  return go(e).value()
}

/*
 * -------------------------------------------
 * Validation Monad
 * -------------------------------------------
 */

export type V<C> = HKT.CleanParam<C, 'E'> & HKT.Fix<'E', DecodeErrors>

export function getDecodeErrorsValidation<M extends HKT.URIS, C = HKT.Auto>(
  M: P.MonadFail<M, C> & P.Bifunctor<M, C> & P.Fallible<M, C>
): MonadDecoder<M, C, DecodeErrors>
export function getDecodeErrorsValidation<M>(
  M: P.MonadFail<HKT.UHKT2<M>> & P.Bifunctor<HKT.UHKT2<M>> & P.Fallible<HKT.UHKT2<M>>
): MonadDecoder<HKT.UHKT2<M>, HKT.Auto, DecodeErrors> {
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
