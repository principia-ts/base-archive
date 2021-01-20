import type { Show } from './Show'

import { makeShow } from './Show'

export class Exception<T = any> extends Error {
  readonly stackTrace: ReadonlyArray<string>
  readonly stack!: string

  constructor(readonly message: string, readonly data?: T) {
    super(message)

    Object.defineProperty(this, 'name', {
      enumerable: true,
      value: this.constructor.name
    })
    Object.defineProperty(this, 'message', {
      enumerable: true,
      value: message
    })
    this.stackTrace = this.stack.split('\n')
  }
}

export function getVerboseShow<T>(ST: Show<T>): Show<Exception<T>> {
  return makeShow(
    (ex) =>
      `An exception occurred at ${ex.stackTrace[0]}\n  [${ex.name}]: ${ex.message}${
        ex.data ? '\n  ' + ST.show(ex.data) : ''
      }`
  )
}
