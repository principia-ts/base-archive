import type { AssertionValue } from '../Assertion'
import type { GenFailureDetails } from '../GenFailureDetails'
import type { FailureDetails } from './FailureDetails'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Option } from '@principia/base/Option'
import type { Cause } from '@principia/io/Cause'
import type { USync } from '@principia/base/Sync'

import * as A from '@principia/base/Array'
import * as Ev from '@principia/base/Eval'
import * as O from '@principia/base/Option'
import { BLUE, CYAN, RED, YELLOW } from '@principia/base/util/AnsiFormat'
import * as C from '@principia/io/Cause'
import * as Sy from '@principia/base/Sync'

import * as BA from '../FreeBooleanAlgebra'
import { TestTimeoutException } from '../TestTimeoutException'

const tabSize = 2
export class Message {
  constructor(readonly lines: ReadonlyArray<Line> = []) {}

  ['+:'](line: Line): Message {
    return new Message(A.prepend_(this.lines, line))
  }
  [':+'](line: Line): Message {
    return new Message(A.append(line)(this.lines))
  }
  ['++'](message: Message): Message {
    return new Message(A.concat_(this.lines, message.lines))
  }
  drop(n: number): Message {
    return new Message(A.drop_(this.lines, n))
  }
  map(f: (line: Line) => Line): Message {
    return new Message(A.map_(this.lines, f))
  }
  withOffset(offset: number): Message {
    return new Message(A.map_(this.lines, (l) => l.withOffset(offset)))
  }
  static empty = new Message()
}

export class Line {
  constructor(readonly fragments: ReadonlyArray<Fragment> = [], readonly offset: number = 0) {}

  [':+'](fragment: Fragment): Line {
    return new Line(A.append(fragment)(this.fragments))
  }
  prepend(this: Line, message: Message): Message {
    return new Message(A.prepend_(message.lines, this))
  }
  ['+'](fragment: Fragment): Line {
    return new Line(A.append(fragment)(this.fragments))
  }
  ['+|'](line: Line): Message {
    return new Message([this, line])
  }
  ['++'](line: Line): Line {
    return new Line(A.concat_(this.fragments, line.fragments), this.offset)
  }
  withOffset(shift: number): Line {
    return new Line(this.fragments, this.offset + shift)
  }
  toMessage(): Message {
    return new Message([this])
  }

  static fromString(text: string, offset = 0): Line {
    return new Fragment(text).toLine().withOffset(offset)
  }

  static empty = new Line()
}

export class Fragment {
  constructor(readonly text: string, readonly colorCode: string = '') {}

  ['+:'](line: Line): Line {
    return this.prependTo(line)
  }
  prependTo(this: Fragment, line: Line): Line {
    return new Line(A.prepend(this)(line.fragments), line.offset)
  }
  ['+'](f: Fragment): Line {
    return new Line([this, f])
  }
  toLine(): Line {
    return new Line([this])
  }
}

export function renderFailureDetails(failureDetails: FailureDetails, offset: number): Message {
  return renderGenFailureDetails(failureDetails.gen, offset)['++'](
    renderAssertionFailureDetails(failureDetails.assertion, offset)
  )
}

function renderAssertionFailureDetails(failureDetails: NonEmptyArray<AssertionValue<any>>, offset: number): Message {
  const loop = (failureDetails: ReadonlyArray<AssertionValue<any>>, rendered: Message): Ev.Eval<Message> => {
    return Ev.gen(function* (_) {
      const [fragment, whole, ...details] = failureDetails
      if (fragment != null && whole != null) {
        return yield* _(loop([whole, ...details], rendered['+:'](renderWhole(fragment, whole, offset))))
      } else {
        return rendered
      }
    })
  }

  return renderFragment(failureDetails[0], offset)
    .toMessage()
    ['++'](Ev.evaluate(loop(failureDetails, Message.empty)))
}

function renderWhole(fragment: AssertionValue<any>, whole: AssertionValue<any>, offset: number): Line {
  return withOffset(offset + tabSize)(
    blue(whole.showValue())
      ['+'](renderSatisfied(whole))
      ['++'](highlight(cyan(whole.assertion().toString()), fragment.assertion().toString()))
  )
}

function renderGenFailureDetails(failureDetails: Option<GenFailureDetails>, offset: number): Message {
  return O.match_(
    failureDetails,
    () => Message.empty,
    (details) => {
      const shrunken       = `${details.shrunkenInput}`
      const initial        = `${details.initialInput}`
      const renderShrunken = withOffset(offset + tabSize)(
        new Fragment(
          `Test failed after ${details.iterations + 1} iteration${details.iterations > 0 ? 's' : ''} with input: `
        )['+'](red(shrunken))
      )

      return initial === shrunken
        ? renderShrunken.toMessage()
        : renderShrunken['+|'](
            withOffset(offset + tabSize)(new Fragment('Original input before shrinking was: ')['+'](red(initial)))
          )
    }
  )
}

function renderFragment(fragment: AssertionValue<any>, offset: number): Line {
  return withOffset(offset + tabSize)(
    blue(fragment.showValue())['+'](renderSatisfied(fragment))['+'](cyan(fragment.assertion().toString()))
  )
}

function highlight(fragment: Fragment, substring: string, colorCode = YELLOW): Line {
  const parts = fragment.text.split(substring)
  if (parts.length === 1) {
    return fragment.toLine()
  } else {
    return A.foldl_(parts, Line.empty, (line, part) =>
      line.fragments.length < parts.length * 2 - 2
        ? line['+'](new Fragment(part, fragment.colorCode))['+'](new Fragment(substring, colorCode))
        : line['+'](new Fragment(part, fragment.colorCode))
    )
  }
}

function renderSatisfied(fragment: AssertionValue<any>): Fragment {
  return BA.isTrue(fragment.result()) ? new Fragment(' satisfied ') : new Fragment(' did not satisfy ')
}

export function renderCause(cause: Cause<any>, offset: number): Message {
  const printCause = () =>
    new Message(A.map_(C.pretty(cause).split('\n'), (s) => withOffset(offset + tabSize)(Line.fromString(s))))
  return O.match_(C.dieOption(cause), printCause, (_) => {
    if (_ instanceof TestTimeoutException) {
      return new Fragment(_.message).toLine().toMessage()
    } else {
      return printCause()
    }
  })
}

function withOffset(i: number): (line: Line) => Line {
  return (line) => line.withOffset(i)
}

function blue(s: string): Fragment {
  return new Fragment(s, BLUE)
}

function red(s: string): Fragment {
  return new Fragment(s, RED)
}

function cyan(s: string): Fragment {
  return new Fragment(s, CYAN)
}
