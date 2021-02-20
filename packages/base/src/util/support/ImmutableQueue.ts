import * as A from '../../Array'
import * as NA from '../../NonEmptyArray'
import * as O from '../../Option'

export class ImmutableQueue<A> {
  constructor(private readonly backing: readonly A[]) {}

  push(a: A) {
    return new ImmutableQueue([...this.backing, a])
  }

  prepend(a: A) {
    return new ImmutableQueue([a, ...this.backing])
  }

  get size() {
    return this.backing.length
  }

  dequeue() {
    if (A.isNonEmpty(this.backing)) {
      return O.Some([NA.head(this.backing), new ImmutableQueue(NA.tail(this.backing))] as const)
    } else {
      return O.None()
    }
  }

  find(f: (a: A) => boolean) {
    return A.findFirst(f)(this.backing)
  }

  filter(f: (a: A) => boolean) {
    return new ImmutableQueue(A.filter(f)(this.backing))
  }
}
