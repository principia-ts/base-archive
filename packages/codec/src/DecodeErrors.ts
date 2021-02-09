import type { DecodeError } from './DecodeError'
import type { MonadDecoder } from './DecoderK'
import type { RoseTree } from '@principia/base/RoseTree'
import type * as P from '@principia/base/typeclass'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import * as Eval from '@principia/base/Eval'
import { identity, pipe, tuple } from '@principia/base/Function'
import * as HKT from '@principia/base/HKT'
import * as T from '@principia/base/RoseTree'
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

const toTree: (e: DecodeError<ErrorInfo>) => RoseTree<string> = fold({
  Leaf: (input, expected) => T.make(`cannot decode ${JSON.stringify(input)}, should be ${expected}`, A.empty()),
  Key: (key, kind, errors) => T.make(`${kind} property ${JSON.stringify(key)}`, toForest(errors)),
  Index: (index, kind, errors) => T.make(`${kind} index ${index}`, toForest(errors)),
  Member: (index, errors) => T.make(`member ${index}`, toForest(errors)),
  Lazy: (id, errors) => T.make(`lazy type ${id}`, toForest(errors)),
  Wrap: (error, errors) => T.make(showErrorInfo(error), toForest(errors)),
  Info: (error) => T.make(showErrorInfo(error), A.empty())
})

export function toForest(e: DecodeErrors): ReadonlyArray<RoseTree<string>> {
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
  return go(e).value
}

/*
 * -------------------------------------------
 * Validation Monad
 * -------------------------------------------
 */

export type V<C> = HKT.CleanParam<C, 'E'> & HKT.Fix<'E', DecodeErrors>

export function getDecodeErrorsValidation<M extends HKT.URIS, C = HKT.Auto>(
  M: P.MonadExcept<M, C> & P.Bifunctor<M, C>
): MonadDecoder<M, C, DecodeErrors>
export function getDecodeErrorsValidation<M>(
  M: P.MonadExcept<HKT.UHKT2<M>> & P.Bifunctor<HKT.UHKT2<M>>
): MonadDecoder<HKT.UHKT2<M>, HKT.Auto, DecodeErrors> {
  const crossWith_: P.CrossWithFn_<HKT.UHKT2<M>, V<HKT.Auto>> = (fa, fb, f) =>
    M.flatten(
      M.crossWith_(M.attempt(fa), M.attempt(fb), (ea, eb) =>
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
      M.attempt(fa),
      M.bind(E.fold((e) => pipe(M.attempt(that()), M.bind(E.fold((e1) => M.fail(FS.combine(e, e1)), M.pure))), M.pure))
    )

  return HKT.instance<
    P.Monad<HKT.UHKT2<M>, V<HKT.Auto>> &
      P.Alt<HKT.UHKT2<M>, V<HKT.Auto>> &
      P.Bifunctor<HKT.UHKT2<M>, HKT.Auto> &
      P.Fail<HKT.UHKT2<M>, HKT.Auto>
  >({
    invmap_: M.invmap_,
    invmap: M.invmap,
    map_: M.map_,
    map: M.map,
    crossWith_,
    crossWith: (fb, f) => (fa) => crossWith_(fa, fb, f),
    cross_: (fa, fb) => crossWith_(fa, fb, tuple),
    cross: (fb) => (fa) => crossWith_(fa, fb, tuple),
    ap_: (fab, fa) => crossWith_(fab, fa, (f, a) => f(a)),
    ap: (fa) => (fab) => crossWith_(fab, fa, (f, a) => f(a)),
    mapLeft_: M.mapLeft_,
    mapLeft: M.mapLeft,
    bimap_: M.bimap_,
    bimap: M.bimap,
    bind_: M.bind_,
    bind: M.bind,
    flatten: M.flatten,
    fail: M.fail,
    alt_,
    alt: (that) => (me) => alt_(me, that),
    pure: M.pure,
    unit: M.unit
  })
}
