import type { CustomRuntime } from '@principia/io/IO'

import { AtomicBoolean } from '@principia/base/util/support/AtomicBoolean'
import * as Cause from '@principia/io/Cause'
import * as Fiber from '@principia/io/Fiber'
import { interruptAllAs } from '@principia/io/Fiber'
import * as I from '@principia/io/IO'
import { defaultRuntime } from '@principia/io/IO'

export function defaultTeardown(status: number, id: Fiber.FiberId, onExit: (status: number) => void) {
  I.run_(interruptAllAs(id)(Fiber._tracing.running), () => {
    setTimeout(() => {
      if (Fiber._tracing.running.size === 0) {
        onExit(status)
      } else {
        defaultTeardown(status, id, onExit)
      }
    }, 0)
  })
}

export const defaultHook = (cont: NodeJS.SignalsListener): ((signal: NodeJS.Signals) => void) => (signal) =>
  cont(signal)

export class NodeRuntime<R> {
  constructor(readonly custom: CustomRuntime<R>) {
    this.runMain = this.runMain.bind(this)
  }

  /**
   * Runs effect until completion listening for system level termination signals that
   * triggers cancellation of the process, in case errors are found process will
   * exit with a status of 1 and cause will be pretty printed, if interruption
   * is found without errors the cause is pretty printed and process exits with
   * status 0. In the success scenario process exits with status 0 witout any log.
   *
   * Note: this should be used only in node.js as it depends on global process
   */
  runMain<E>(
    effect: I.IO<I.DefaultEnv, E, void>,
    customHook: (cont: NodeJS.SignalsListener) => NodeJS.SignalsListener = defaultHook,
    customTeardown: typeof defaultTeardown = defaultTeardown
  ): void {
    const context = this.custom.fiberContext<E, void>()

    const onExit = (s: number) => {
      process.exit(s)
    }

    context.evaluateLater(effect[I._I])
    context.runAsync((exit) => {
      switch (exit._tag) {
        case 'Failure': {
          if (Cause.interruptedOnly(exit.cause)) {
            customTeardown(0, context.id, onExit)
            break
          } else {
            console.error(Cause.pretty(exit.cause))
            customTeardown(1, context.id, onExit)
            break
          }
        }
        case 'Success': {
          customTeardown(0, context.id, onExit)
          break
        }
      }
    })

    const interrupted = new AtomicBoolean(false)

    const handler: NodeJS.SignalsListener = (signal) => {
      customHook(() => {
        process.removeListener('SIGTERM', handler)
        process.removeListener('SIGINT', handler)

        if (interrupted.compareAndSet(false, true)) {
          this.custom.run_(context.interruptAs(context.id))
        }
      })(signal)
    }

    process.once('SIGTERM', handler)
    process.once('SIGINT', handler)
  }
}

export const nodeRuntime = new NodeRuntime(defaultRuntime)

export const {
  custom: { run, runAsap, runCancel, runFiber, runPromise, runPromiseExit },
  runMain
} = nodeRuntime
