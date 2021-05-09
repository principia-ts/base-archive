/* eslint-disable functional/immutable-data */
import type { Equatable } from '../Equatable'
import type { Hashable } from '../Hashable'
import type { MutableQueue } from '../util/support/MutableQueue'

import * as C from '../Chunk'
import { $equals } from '../Equatable'
import * as Eq from '../Equatable'
import { $hash } from '../Hashable'
import * as H from '../Hashable'
import * as I from '../IO'
import * as P from '../Promise'

export abstract class Subscription<A> {
  abstract isEmpty(): boolean
  abstract poll(default_: A): A
  abstract pollUpTo(n: number): C.Chunk<A>
  abstract size(): number
  abstract unsubscribe(): void
}

export abstract class Hub<A> {
  abstract readonly capacity: number
  abstract isEmpty(): boolean
  abstract isFull(): boolean
  abstract publish(a: A): boolean
  abstract publishAll(as: Iterable<A>): C.Chunk<A>
  abstract size(): number
  abstract slide(): void
  abstract subscribe(): Subscription<A>
}

export class BoundedHubArb<A> extends Hub<A> {
  array: Array<A>
  publisherIndex = 0
  subscribers: Array<number>
  subscriberCount  = 0
  subscribersIndex = 0

  readonly capacity: number

  constructor(requestedCapacity: number) {
    super()

    this.array       = Array.from({ length: requestedCapacity })
    this.subscribers = Array.from({ length: requestedCapacity })
    this.capacity    = requestedCapacity
  }

  isEmpty(): boolean {
    return this.publisherIndex === this.subscribersIndex
  }

  isFull(): boolean {
    return this.publisherIndex === this.subscribersIndex + this.capacity
  }

  publish(a: A): boolean {
    if (this.isFull()) {
      return false
    }

    if (this.subscriberCount !== 0) {
      const index = this.publisherIndex % this.capacity

      this.array[index]       = a
      this.subscribers[index] = this.subscriberCount
      this.publisherIndex    += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): C.Chunk<A> {
    const asArray   = C.from(as)
    const n         = asArray.length
    const size      = this.publisherIndex - this.subscribersIndex
    const available = this.capacity - size
    const forHub    = Math.min(n, available)

    if (forHub === 0) {
      return asArray
    }

    let iteratorIndex     = 0
    const publishAllIndex = this.publisherIndex + forHub

    while (this.publisherIndex !== publishAllIndex) {
      const a              = asArray[iteratorIndex++]!
      const index          = this.publisherIndex % this.capacity
      this.array[index]    = a
      this.publisherIndex += 1
    }

    return C.drop_(asArray, iteratorIndex - 1)
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
  }

  slide(): void {
    if (this.subscribersIndex !== this.publisherIndex) {
      const index = this.subscribersIndex % this.capacity

      this.array[index]       = (null as unknown) as A
      this.subscribers[index] = 0
      this.subscribersIndex  += 1
    }
  }

  subscribe(): Subscription<A> {
    this.subscriberCount += 1

    return new BoundedHubArbSubscription(this, this.publisherIndex, false)
  }
}

class BoundedHubArbSubscription<A> extends Subscription<A> {
  constructor(private self: BoundedHubArb<A>, private subscriberIndex: number, private unsubscribed: boolean) {
    super()
  }

  isEmpty(): boolean {
    return (
      this.unsubscribed ||
      this.self.publisherIndex === this.subscriberIndex ||
      this.self.publisherIndex === this.self.subscribersIndex
    )
  }

  poll(default_: A): A {
    if (this.unsubscribed) {
      return default_
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)

    if (this.subscriberIndex !== this.self.publisherIndex) {
      const index = this.subscriberIndex % this.self.capacity
      const a     = this.self.array[index]!

      this.self.subscribers[index] -= 1

      if (this.self.subscribers[index] === 0) {
        this.self.array[index]      = (null as unknown) as A
        this.self.subscribersIndex += 1
      }

      this.subscriberIndex += 1
      return a
    }

    return default_
  }

  pollUpTo(n: number): C.Chunk<A> {
    if (this.unsubscribed) {
      return C.empty()
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)
    const size           = this.self.publisherIndex - this.subscriberIndex
    const toPoll         = Math.min(n, size)

    if (toPoll <= 0) {
      return C.empty()
    }

    let builder         = C.empty<A>()
    const pollUpToIndex = this.subscriberIndex + toPoll

    while (this.subscriberIndex !== pollUpToIndex) {
      const index           = this.subscriberIndex % this.self.capacity
      const a               = this.self.array[index] as A
      builder               = C.append_(builder, a)
      this.subscriberIndex += 1
    }

    return builder
  }

  size() {
    if (this.unsubscribed) {
      return 0
    }

    return this.self.publisherIndex - Math.max(this.subscriberIndex, this.self.subscribersIndex)
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed          = true
      this.self.subscriberCount -= 1
      this.subscriberIndex       = Math.max(this.subscriberIndex, this.self.subscribersIndex)

      while (this.subscriberIndex !== this.self.publisherIndex) {
        const index                   = this.subscriberIndex % this.self.capacity
        this.self.subscribers[index] -= 1

        if (this.self.subscribers[index] === 0) {
          this.self.array[index]      = (null as unknown) as A
          this.self.subscribersIndex += 1
        }

        this.subscriberIndex += 1
      }
    }
  }
}
export class BoundedHubPow2<A> extends Hub<A> {
  array: Array<A>
  mask: number
  publisherIndex = 0
  subscribers: Array<number>
  subscriberCount  = 0
  subscribersIndex = 0

  readonly capacity: number

  constructor(requestedCapacity: number) {
    super()

    this.array = Array.from({ length: requestedCapacity })
    // eslint-disable-next-line no-param-reassign
    this.mask        = requestedCapacity = 1
    this.subscribers = Array.from({ length: requestedCapacity })
    this.capacity    = requestedCapacity
  }

  isEmpty(): boolean {
    return this.publisherIndex === this.subscribersIndex
  }

  isFull(): boolean {
    return this.publisherIndex === this.subscribersIndex + this.capacity
  }

  publish(a: A): boolean {
    if (this.isFull()) {
      return false
    }

    if (this.subscriberCount !== 0) {
      const index = this.publisherIndex & this.mask

      this.array[index] = a

      this.subscribers[index] = this.subscriberCount
      this.publisherIndex    += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): C.Chunk<A> {
    const asArray   = C.from(as)
    const n         = asArray.length
    const size      = this.publisherIndex - this.subscribersIndex
    const available = this.capacity - size
    const forHub    = Math.min(n, available)

    if (forHub === 0) {
      return asArray
    }

    let iteratorIndex     = 0
    const publishAllIndex = this.publisherIndex + forHub

    while (this.publisherIndex !== publishAllIndex) {
      const a              = asArray[iteratorIndex++]!
      const index          = this.publisherIndex & this.mask
      this.array[index]    = a
      this.publisherIndex += 1
    }

    return C.drop_(asArray, iteratorIndex - 1)
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
  }

  slide(): void {
    if (this.subscribersIndex !== this.publisherIndex) {
      const index = this.subscribersIndex & this.mask

      this.array[index]       = (null as unknown) as A
      this.subscribers[index] = 0
      this.subscribersIndex  += 1
    }
  }

  subscribe(): Subscription<A> {
    this.subscriberCount += 1

    return new BoundedHubPow2Subcription(this, this.publisherIndex, false)
  }
}

class BoundedHubPow2Subcription<A> extends Subscription<A> {
  constructor(private self: BoundedHubPow2<A>, private subscriberIndex: number, private unsubscribed: boolean) {
    super()
  }

  isEmpty(): boolean {
    return (
      this.unsubscribed ||
      this.self.publisherIndex === this.subscriberIndex ||
      this.self.publisherIndex === this.self.subscribersIndex
    )
  }

  poll(default_: A): A {
    if (this.unsubscribed) {
      return default_
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)

    if (this.subscriberIndex !== this.self.publisherIndex) {
      const index = this.subscriberIndex & this.self.mask
      const a     = this.self.array[index]!

      this.self.subscribers[index] -= 1

      if (this.self.subscribers[index] === 0) {
        this.self.array[index]      = (null as unknown) as A
        this.self.subscribersIndex += 1
      }

      this.subscriberIndex += 1
      return a
    }

    return default_
  }

  pollUpTo(n: number): C.Chunk<A> {
    if (this.unsubscribed) {
      return C.empty()
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)
    const size           = this.self.publisherIndex - this.subscriberIndex
    const toPoll         = Math.min(n, size)

    if (toPoll <= 0) {
      return C.empty()
    }

    let builder         = C.empty<A>()
    const pollUpToIndex = this.subscriberIndex + toPoll

    while (this.subscriberIndex !== pollUpToIndex) {
      const index           = this.subscriberIndex & this.self.mask
      const a               = this.self.array[index] as A
      builder               = C.append_(builder, a)
      this.subscriberIndex += 1
    }

    return builder
  }

  size() {
    if (this.unsubscribed) {
      return 0
    }

    return this.self.publisherIndex - Math.max(this.subscriberIndex, this.self.subscribersIndex)
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed          = true
      this.self.subscriberCount -= 1
      this.subscriberIndex       = Math.max(this.subscriberIndex, this.self.subscribersIndex)

      while (this.subscriberIndex < this.self.publisherIndex) {
        const index                   = this.subscriberIndex & this.self.mask
        this.self.subscribers[index] -= 1

        if (this.self.subscribers[index] === 0) {
          this.self.array[index]      = (null as unknown) as A
          this.self.subscribersIndex += 1
        }

        this.subscriberIndex += 1
      }
    }
  }
}

export class BoundedHubSingle<A> extends Hub<A> {
  publisherIndex  = 0
  subscriberCount = 0
  subscribers     = 0
  value: A        = (null as unknown) as A

  readonly capacity = 1

  constructor() {
    super()
  }

  isEmpty(): boolean {
    return this.subscribers === 0
  }

  isFull(): boolean {
    return !this.isEmpty()
  }

  publish(a: A): boolean {
    if (this.isFull()) {
      return false
    }

    if (this.subscriberCount !== 0) {
      this.value           = a
      this.subscribers     = this.subscriberCount
      this.publisherIndex += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): C.Chunk<A> {
    const list = C.from(as)

    if (C.isEmpty(list)) {
      return C.empty()
    }

    if (this.publish(C.unsafeHead(list)!)) {
      return C.drop_(list, 1)
    } else {
      return list
    }
  }

  size(): number {
    return this.isEmpty() ? 0 : 1
  }

  slide(): void {
    if (this.isFull()) {
      this.subscribers = 0
      this.value       = (null as unknown) as A
    }
  }

  subscribe(): Subscription<A> {
    this.subscriberCount += 1

    return new BoundedHubSingleSubscription(this, this.publisherIndex, false)
  }
}

class BoundedHubSingleSubscription<A> extends Subscription<A> {
  constructor(private self: BoundedHubSingle<A>, private subscriberIndex: number, private unsubscribed: boolean) {
    super()
  }

  isEmpty(): boolean {
    return this.unsubscribed || this.self.subscribers === 0 || this.subscriberIndex === this.self.publisherIndex
  }

  poll(default_: A): A {
    if (this.isEmpty()) {
      return default_
    }

    const a = this.self.value

    this.self.subscribers -= 1

    if (this.self.subscribers === 0) {
      this.self.value = (null as unknown) as A
    }

    this.subscriberIndex += 1

    return a
  }

  pollUpTo(n: number): C.Chunk<A> {
    if (this.isEmpty() || n < 1) {
      return C.empty()
    }

    const a = this.self.value

    this.self.subscribers -= 1

    if (this.self.subscribers === 0) {
      this.self.value = (null as unknown) as A
    }

    this.subscriberIndex += 1

    return C.single(a)
  }

  size() {
    return this.isEmpty() ? 0 : 1
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed          = true
      this.self.subscriberCount -= 1

      if (this.subscriberIndex !== this.self.publisherIndex) {
        this.self.subscribers -= 1

        if (this.self.subscribers === 0) {
          this.self.value = (null as unknown) as A
        }
      }
    }
  }
}

class Node<A> {
  constructor(public value: A | null, public subscribers: number, public next: Node<A> | null) {}
}

export class UnboundedHub<A> extends Hub<A> {
  publisherHead  = new Node<A>(null, 0, null)
  publisherIndex = 0
  publisherTail: Node<A>
  subscribersIndex = 0

  readonly capacity = Number.MAX_SAFE_INTEGER

  constructor() {
    super()

    this.publisherTail = this.publisherHead
  }

  isEmpty(): boolean {
    return this.publisherHead === this.publisherTail
  }

  isFull(): boolean {
    return false
  }

  publish(a: A): boolean {
    const subscribers = this.publisherTail.subscribers

    if (subscribers !== 0) {
      this.publisherTail.next = new Node(a, subscribers, null)
      this.publisherTail      = this.publisherTail.next
      this.publisherIndex    += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): C.Chunk<A> {
    for (const a of as) {
      this.publish(a)
    }
    return C.empty()
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
  }

  slide(): void {
    if (this.publisherHead !== this.publisherTail) {
      this.publisherHead       = this.publisherHead.next!
      this.publisherHead.value = null
      this.subscribersIndex   += 1
    }
  }

  subscribe(): Subscription<A> {
    this.publisherTail.subscribers += 1

    return new UnboundedHubSubscription(this, this.publisherTail, this.publisherIndex, false)
  }
}

class UnboundedHubSubscription<A> extends Subscription<A> {
  constructor(
    private self: UnboundedHub<A>,
    private subscriberHead: Node<A>,
    private subscriberIndex: number,
    private unsubscribed: boolean
  ) {
    super()
  }

  isEmpty(): boolean {
    if (this.unsubscribed) {
      return true
    }

    let empty = true
    let loop  = true

    while (loop) {
      if (this.subscriberHead === this.self.publisherTail) {
        loop = false
      } else {
        if (this.subscriberHead.next!.value !== null) {
          empty = false
          loop  = false
        } else {
          this.subscriberHead   = this.subscriberHead.next!
          this.subscriberIndex += 1
        }
      }
    }

    return empty
  }

  poll(default_: A): A {
    if (this.unsubscribed) {
      return default_
    }

    let loop   = true
    let polled = default_

    while (loop) {
      if (this.subscriberHead === this.self.publisherTail) {
        loop = false
      } else {
        const a = this.subscriberHead.next!.value

        if (a !== null) {
          polled                           = a
          this.subscriberHead.subscribers -= 1

          if (this.subscriberHead.subscribers === 0) {
            this.self.publisherHead       = this.self.publisherHead.next!
            this.self.publisherHead.value = null
            this.self.subscribersIndex   += 1
          }

          loop = false
        }

        this.subscriberHead   = this.subscriberHead.next!
        this.subscriberIndex += 1
      }
    }

    return polled
  }

  pollUpTo(n: number): C.Chunk<A> {
    let builder    = C.empty<A>()
    const default_ = null
    let i          = 0

    while (i !== n) {
      const a = this.poll((default_ as unknown) as A)
      if (a === default_) {
        i = n
      } else {
        builder = C.append_(builder, a)
        i      += 1
      }
    }

    return builder
  }

  size() {
    if (this.unsubscribed) {
      return 0
    }

    return this.self.publisherIndex - Math.max(this.subscriberIndex, this.self.subscribersIndex)
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed                    = true
      this.self.publisherTail.subscribers -= 1

      while (this.subscriberHead !== this.self.publisherTail) {
        if (this.subscriberHead.next!.value !== null) {
          this.subscriberHead.subscribers -= 1

          if (this.subscriberHead.subscribers === 0) {
            this.self.publisherHead       = this.self.publisherHead.next!
            this.self.publisherHead.value = null
            this.self.subscribersIndex   += 1
          }
        }
        this.subscriberHead = this.subscriberHead.next!
      }
    }
  }
}

export class HashedPair<A, B> implements Hashable, Equatable {
  constructor(readonly first: A, readonly second: B) {}

  get [$hash]() {
    return H.combineHash(H.hash(this.first), H.hash(this.second))
  }

  [$equals](that: unknown) {
    return that instanceof HashedPair && Eq.equals(this.first, that.first) && Eq.equals(this.second, that.second)
  }
}

export class InvalidCapacityError extends Error {
  readonly _tag = 'InvalidCapacityError'

  constructor(message?: string) {
    super(message)
    this.name = this._tag
  }
}

export function ensureCapacity(capacity: number): asserts capacity {
  if (capacity <= 0) {
    throw new InvalidCapacityError(`A Hub cannot have a capacity of ${capacity}`)
  }
}

export function isInvalidCapacityError(u: unknown): u is InvalidCapacityError {
  return u instanceof Error && '_tag' in u && u['_tag'] === 'InvalidCapacityError'
}

function nextPow2(n: number): number {
  const nextPow = Math.ceil(Math.log(n) / Math.log(2.0))

  return Math.max(Math.pow(2, nextPow), 2)
}

export function makeBounded<A>(requestedCapacity: number): Hub<A> {
  ensureCapacity(requestedCapacity)

  if (requestedCapacity === 1) {
    return new BoundedHubSingle()
  } else if (nextPow2(requestedCapacity) === requestedCapacity) {
    return new BoundedHubPow2(requestedCapacity)
  } else {
    return new BoundedHubArb(requestedCapacity)
  }
}

export function makeUnbounded<A>(): Hub<A> {
  return new UnboundedHub()
}

/**
 * Unsafely completes a promise with the specified value.
 */
export function unsafeCompletePromise<A>(promise: P.Promise<never, A>, a: A): void {
  P.unsafeDone(I.succeed(a))(promise)
}

/**
 * Unsafely offers the specified values to a queue.
 */
export function unsafeOfferAll<A>(queue: MutableQueue<A>, as: Iterable<A>): C.Chunk<A> {
  return queue.offerAll(as)
}

/**
 * Unsafely polls all values from a queue.
 */
export function unsafePollAllQueue<A>(queue: MutableQueue<A>): C.Chunk<A> {
  return queue.pollUpTo(Number.MAX_SAFE_INTEGER)
}

/**
 * Unsafely polls all values from a subscription.
 */
export function unsafePollAllSubscription<A>(subscription: Subscription<A>): C.Chunk<A> {
  return subscription.pollUpTo(Number.MAX_SAFE_INTEGER)
}

/**
 * Unsafely polls the specified number of values from a subscription.
 */
export function unsafePollN<A>(subscription: Subscription<A>, max: number): C.Chunk<A> {
  return subscription.pollUpTo(max)
}

/**
 * Unsafely publishes the specified values to a hub.
 */
export function unsafePublishAll<A>(hub: Hub<A>, as: Iterable<A>): C.Chunk<A> {
  return hub.publishAll(as)
}

/**
 * Unsafely removes the specified item from a queue.
 */
export function unsafeRemove<A>(queue: MutableQueue<A>, a: A): void {
  unsafeOfferAll(
    queue,
    C.filter_(unsafePollAllQueue(queue), (_) => _ !== a)
  )
}
