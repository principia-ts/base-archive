import type { DecodeError } from './DecodeError'
import type { MonadDecoder } from './MonadDecoder'
import type { RoseTree } from '@principia/base/RoseTree'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import * as Eval from '@principia/base/Eval'
import { identity, pipe } from '@principia/base/Function'
import * as HKT from '@principia/base/HKT'
import * as T from '@principia/base/RoseTree'
import * as P from '@principia/base/typeclass'
import * as FS from '@principia/free/FreeSemigroup'

import { Info, Leaf, match } from './DecodeError'

type Eval<A> = Eval.Eval<A>

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type DecodeErrors = FS.FreeSemigroup<DecodeError<ErrorInfo>>

export interface ErrorInfo {
  name?: string
  id?: string
  message?: string
}

/*
 * -------------------------------------------
 * Utilities
 * -------------------------------------------
 */

const showErrorInfo = (info: ErrorInfo): string =>
  info.name && info.message ? `${info.name}: ${info.message}` : info.name ?? info.message ?? ''

const isInfoPopulated = (info?: ErrorInfo): info is ErrorInfo => !!info?.id || !!info?.name || !!info?.message

export function error(actual: unknown, expected: string, errorInfo?: ErrorInfo): DecodeErrors {
  return isInfoPopulated(errorInfo)
    ? FS.Combine(FS.Element(Leaf(actual, expected)), FS.Element(Info(errorInfo)))
    : FS.Element(Leaf(actual, expected))
}

const toTree: (e: DecodeError<ErrorInfo>) => RoseTree<string> = match({
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
  const go = (e: DecodeErrors): Eval<Record<string, any>> =>
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

export function getValidation<M extends HKT.URIS, C = HKT.Auto>(
  M: P.MonadExcept<M, C> & P.Bifunctor<M, C>
): MonadDecoder<M, C, DecodeErrors>
export function getValidation<M>(
  M: P.MonadExcept<HKT.UHKT2<M>> & P.Bifunctor<HKT.UHKT2<M>>
): MonadDecoder<HKT.UHKT2<M>, HKT.Auto, DecodeErrors> {
  const attempt = P.attemptF(M)

  const crossWith_: P.CrossWithFn_<HKT.UHKT2<M>, V<HKT.Auto>> = (fa, fb, f) =>
    P.flattenF(M)(
      M.crossWith_(attempt(fa), attempt(fb), (ea, eb) =>
        E.isLeft(ea)
          ? E.isLeft(eb)
            ? M.fail(FS.Combine(ea.left, eb.left))
            : M.fail(ea.left)
          : E.isLeft(eb)
          ? M.fail(eb.left)
          : M.pure(f(ea.right, eb.right))
      )
    )

  const alt_: P.AltFn_<HKT.UHKT2<M>, V<HKT.Auto>> = (fa, that) =>
    pipe(
      attempt(fa),
      M.bind(E.match((e) => pipe(attempt(that()), M.bind(E.match((e1) => M.fail(FS.Combine(e, e1)), M.pure))), M.pure))
    )

  return HKT.instance<
    P.Monad<HKT.UHKT2<M>, V<HKT.Auto>> &
      P.Alt<HKT.UHKT2<M>, V<HKT.Auto>> &
      P.Bifunctor<HKT.UHKT2<M>, HKT.Auto> &
      P.Fail<HKT.UHKT2<M>, HKT.Auto>
  >({
    ...P.Monad({
      map_: M.map_,
      crossWith_,
      bind_: M.bind_,
      flatten: M.flatten,
      unit: M.unit,
      pure: M.pure
    }),
    ...P.Alt({
      map_: M.map_,
      alt_
    }),
    ...P.Bifunctor({
      mapLeft_: M.mapLeft_,
      mapRight_: M.mapRight_,
      bimap_: M.bimap_
    }),
    fail: M.fail
  })
}
