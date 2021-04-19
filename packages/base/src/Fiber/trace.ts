import type { FiberId } from './FiberId'

import * as Ev from '../Eval'
import * as L from '../List/core'
import * as O from '../Option'
import { prettyFiberId } from './FiberId'

export type TraceElement = NoLocation | SourceLocation

export class NoLocation {
  readonly _tag = 'NoLocation'
}
export class SourceLocation {
  readonly _tag = 'SourceLocation'
  constructor(readonly location: string) {}
}

export function traceLocation(k: any): TraceElement {
  if (k['$trace']) {
    return new SourceLocation(k['$trace'])
  }
  return new NoLocation()
}

export class Trace {
  constructor(
    readonly fiberId: FiberId,
    readonly executionTrace: L.List<TraceElement>,
    readonly stackTrace: L.List<TraceElement>,
    readonly parentTrace: O.Option<Trace>
  ) {}
}

export function ancestryLengthSafe(trace: Trace, i: number): Ev.Eval<number> {
  const parent = trace.parentTrace
  if (parent._tag === 'None') {
    return Ev.now(i)
  } else {
    return Ev.defer(() => ancestryLengthSafe(parent.value, i + 1))
  }
}

export function ancestryLength(trace: Trace) {
  return Ev.evaluate(ancestryLengthSafe(trace, 0))
}

export function parents(trace: Trace): L.List<Trace> {
  const pushable = L.emptyPushable<Trace>()
  let parent     = O.toUndefined(trace.parentTrace)
  while (parent != null) {
    L.push(parent, pushable)
    parent = O.toUndefined(parent.parentTrace)
  }
  return pushable
}

export function truncatedParentTrace(trace: Trace, maxAncestors: number): O.Option<Trace> {
  if (ancestryLength(trace) > maxAncestors) {
    return L.foldr_(L.take_(parents(trace), maxAncestors), O.None() as O.Option<Trace>, (trace, parent) =>
      O.Some(new Trace(trace.fiberId, trace.executionTrace, trace.stackTrace, parent))
    )
  } else {
    return trace.parentTrace
  }
}

export function prettyLocation(traceElement: TraceElement) {
  return traceElement._tag === 'NoLocation' ? 'No Location Present' : `${traceElement.location}`
}

export function prettyTrace(trace: Trace): string {
  return Ev.evaluate(prettyTraceSafe(trace))
}

export function prettyTraceSafe(trace: Trace): Ev.Eval<string> {
  return Ev.gen(function* ($) {
    const execTrace  = !L.isEmpty(trace.executionTrace)
    const stackTrace = !L.isEmpty(trace.stackTrace)

    const execPrint = execTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} Execution trace:`,
          '',
          ...L.toArray(L.map_(trace.executionTrace, (a) => `  ${prettyLocation(a)}`))
        ]
      : [`Fiber: ${prettyFiberId(trace.fiberId)} Execution trace: <empty trace>`]

    const stackPrint = stackTrace
      ? [
          `Fiber: ${prettyFiberId(trace.fiberId)} was supposed to continue to:`,
          '',
          ...L.toArray(L.map_(trace.stackTrace, (e) => `  a future continuation at ${prettyLocation(e)}`))
        ]
      : [`Fiber: ${prettyFiberId(trace.fiberId)} was supposed to continue to: <empty trace>`]

    const parent = trace.parentTrace

    const ancestry =
      parent._tag === 'None'
        ? [`Fiber: ${prettyFiberId(trace.fiberId)} was spawned by: <empty trace>`]
        : [`Fiber: ${prettyFiberId(trace.fiberId)} was spawned by:\n`, yield* $(prettyTraceSafe(parent.value))]

    return ['', ...stackPrint, '', ...execPrint, '', ...ancestry].join('\n')
  })
}
