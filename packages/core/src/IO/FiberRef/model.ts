/**
 * `FiberRef` described a mutable reference inside of a `Fiber`.
 * Value is automatically propagated to child on fork and merged back in after joining child.
 */
export class FiberRef<A> {
  constructor(readonly initial: A, readonly fork: (a: A) => A, readonly join: (a: A, a1: A) => A) {}
}
