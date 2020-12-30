/**
 * WARNING: Loading this module will perform a side-effect on the globals `Object` and `Function`
 *
 * Global `pipe` and `flow` operators
 */

declare global {
  interface Object {
    ['|>']<A, B>(this: A, f: (a: A) => B): B
  }

  interface Function {
    ['>>']<Args extends ReadonlyArray<unknown>, A, B>(this: (...args: Args) => A, f: (a: A) => B): (...args: Args) => B
  }
}

let patched = false

const patch = () => {
  if (patched) {
    return
  }
  try {
    Object.defineProperty(Object.prototype, '|>', {
      value<A, B>(this: A, f: (a: A) => B): B {
        return f(this)
      },
      enumerable: false
    })
    Object.defineProperty(Function.prototype, '>>', {
      value<Args extends ReadonlyArray<unknown>, A, B>(
        this: (...args: Args) => A,
        f: (a: A) => B
      ): (...args: Args) => B {
        return (...args) => f(this(...args))
      },
      enumerable: false
    })
  } catch (e) {
    console.error(`Operator patching failed with ${e}`)
  }
  patched = true
}

patch()

export {}
