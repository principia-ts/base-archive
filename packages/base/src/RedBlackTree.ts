/* eslint-disable functional/immutable-data */

/**
 * A persistent red-black tree implementation with iterative, stack-safe operations
 *
 * Forked from https://github.com/mikolalysenko/functional-red-black-tree
 */

import type { Option } from './Option'
import type { Ord, Semigroup } from './typeclass'
import type { Stack } from './util/support/Stack'

import * as O from './Option'
import { makeStack } from './util/support/Stack'

export class RedBlackTree<K, V> implements RedBlackTreeIterable<K, V> {
  constructor(readonly ord: Ord<K>, readonly root: Node<K, V> | Leaf) {}

  [Symbol.iterator](): RedBlackTreeIterator<K, V> {
    return forward(this)[Symbol.iterator]()
  }
}

export function make<K, V>(ord: Ord<K>) {
  return new RedBlackTree<K, V>(ord, null)
}

/**
 * Inserts an element into the correct position in the `RedBlackTree`.
 * This function ignores duplicate keys. For one that combines duplicate key's values,
 * see `insertWith_`
 */
export function insert_<K, V>(tree: RedBlackTree<K, V>, key: K, value: V): RedBlackTree<K, V> {
  if (isEmptyNode(tree.root)) {
    return new RedBlackTree(tree.ord, Node(R, Leaf, key, value, Leaf, 1))
  }
  const cmp                                   = tree.ord.compare_
  const nodeStack: Array<Mutable<Node<K, V>>> = []
  const orderStack: Array<1 | -1>             = []
  let n: RBNode<K, V>                         = tree.root
  while (n) {
    const d = cmp(key, n.key)
    nodeStack.push(n)
    switch (d) {
      case -1: {
        orderStack.push(d)
        n = n.left
        break
      }
      case 1: {
        orderStack.push(d)
        n = n.right
        break
      }
      case 0: {
        return tree
      }
    }
  }

  nodeStack.push(Node(R, Leaf, key, value, Leaf, 1))
  rebuildModifiedPath(nodeStack, orderStack)
  balanceModifiedPath(nodeStack)

  return new RedBlackTree(tree.ord, nodeStack[0])
}

/**
 * Inserts an element into the correct position in the `RedBlackTree`.
 * This function ignores duplicate keys. For one that combines duplicate key's values,
 * see `insertWith_`
 */
export function insert<K, V>(key: K, value: V): (tree: RedBlackTree<K, V>) => RedBlackTree<K, V> {
  return (tree) => insert_(tree, key, value)
}

/**
 * Inserts an element into the correct position in the `RedBlackTree`, combining euqal key's values
 * with a `Semigroup` instance
 */
export function insertWith_<V>(S: Semigroup<V>) {
  return <K>(tree: RedBlackTree<K, V>, key: K, value: V) => {
    if (isEmptyNode(tree.root)) {
      return new RedBlackTree(tree.ord, Node(R, Leaf, key, value, Leaf, 1))
    }
    const com                                   = S.combine_
    const cmp                                   = tree.ord.compare_
    const nodeStack: Array<Mutable<Node<K, V>>> = []
    const orderStack: Array<1 | -1>             = []
    let n: RBNode<K, V>                         = tree.root
    let cv: V | null                            = null
    while (n && !cv) {
      const d = cmp(key, n.key)
      nodeStack.push(n)
      switch (d) {
        case -1: {
          orderStack.push(d)
          n = n.left
          break
        }
        case 1: {
          orderStack.push(d)
          n = n.right
          break
        }
        case 0: {
          cv = com(n.value, value)
          break
        }
      }
    }
    if (cv) {
      const u                         = nodeStack[nodeStack.length - 1]
      const updated                   = Node(u.color, u.left, u.key, cv, u.right, u.count)
      nodeStack[nodeStack.length - 1] = updated
      rebuildModifiedPath(nodeStack, orderStack, 0)
    } else {
      nodeStack.push(Node(R, Leaf, key, value, Leaf, 1))
      rebuildModifiedPath(nodeStack, orderStack)
      balanceModifiedPath(nodeStack)
    }
    return new RedBlackTree(tree.ord, nodeStack[0])
  }
}

/**
 * Inserts an element into the correct position in the `RedBlackTree`, combining euqal key's values
 * with a `Semigroup` instance
 */
export function insertWith<V>(
  S: Semigroup<V>
): <K>(key: K, value: V) => (tree: RedBlackTree<K, V>) => RedBlackTree<K, V> {
  const insertWithS_ = insertWith_(S)
  return (key, value) => (tree) => insertWithS_(tree, key, value)
}

/**
 * Returns the first ("smallest") element in a `RedBlackTree`
 */
export function head<K, V>(tree: RedBlackTree<K, V>): Option<readonly [K, V]> {
  return O.map_(headNode(tree.root), (n) => [n.key, n.value])
}

/**
 * Returns the last ("largest") element in a `RedBlackTree`
 */
export function last<K, V>(tree: RedBlackTree<K, V>): Option<readonly [K, V]> {
  return O.map_(lastNode(tree.root), (n) => [n.key, n.value])
}

/**
 * Removes an element from a `RedBlackTree`
 */
export function remove_<K, V>(tree: RedBlackTree<K, V>, key: K): RedBlackTree<K, V> {
  const iter = find_(tree, key)[Symbol.iterator]()
  return iter.isEmpty ? tree : iter.remove()
}

/**
 * Removes an element from a `RedBlackTree`
 */
export function remove<K>(key: K): <V>(tree: RedBlackTree<K, V>) => RedBlackTree<K, V> {
  return (tree) => remove_(tree, key)
}

/**
 * Searches a `RedBlackTree` for a given key, returning it's value, if it exists
 */
export function get_<K, V>(tree: RedBlackTree<K, V>, key: K): Option<V> {
  const cmp = tree.ord.compare_
  let n     = tree.root
  while (n) {
    const d = cmp(key, n.key)
    switch (d) {
      case 0: {
        return O.Some(n.value)
      }
      case -1: {
        n = n.left
        break
      }
      case 1: {
        n = n.right
        break
      }
    }
  }
  return O.None()
}

/**
 * Searches a `RedBlackTree` for a given key, returning it's value, if it exists
 */
export function get<K>(key: K): <V>(tree: RedBlackTree<K, V>) => Option<V> {
  return (tree) => get_(tree, key)
}

/**
 * Searches the tree and returns the first value in sorted order that is >= key, if it exists
 */
export function getGte_<K, V>(tree: RedBlackTree<K, V>, key: K): Option<V> {
  const cmp     = tree.ord.compare_
  let n         = tree.root
  let lastValue = O.None<V>()
  while (n) {
    const d = cmp(key, n.key)
    if (d <= 0) {
      lastValue = O.Some(n.value)
      n         = n.left
    } else {
      if (lastValue._tag === 'Some') {
        break
      }
      n = n.right
    }
  }
  return lastValue
}

/**
 * Searches the tree and returns the first value in sorted order that is >= key, if it exists
 */
export function getGte<K>(key: K): <V>(tree: RedBlackTree<K, V>) => Option<V> {
  return (tree) => getGte_(tree, key)
}

export function getGt_<K, V>(tree: RedBlackTree<K, V>, key: K): Option<V> {
  const cmp     = tree.ord.compare_
  let n         = tree.root
  let lastValue = O.None<V>()
  while (n) {
    const d = cmp(key, n.key)
    if (d < 0) {
      lastValue = O.Some(n.value)
      n         = n.left
    } else {
      if (lastValue._tag === 'Some') {
        break
      }
      n = n.right
    }
  }
  return lastValue
}

export function getGt<K>(key: K): <V>(tree: RedBlackTree<K, V>) => Option<V> {
  return (tree) => getGt_(tree, key)
}

export function getLte_<K, V>(tree: RedBlackTree<K, V>, key: K): Option<V> {
  const cmp     = tree.ord.compare_
  let n         = tree.root
  let lastValue = O.None<V>()
  while (n) {
    const d = cmp(key, n.key)
    if (d > 0) {
      if (lastValue._tag === 'Some') {
        break
      }
      n = n.right
    } else {
      lastValue = O.Some(n.value)
      n         = n.left
    }
  }
  return lastValue
}

export function getLte<K>(key: K): <V>(tree: RedBlackTree<K, V>) => Option<V> {
  return (tree) => getLte_(tree, key)
}

export function getLt_<K, V>(tree: RedBlackTree<K, V>, key: K): Option<V> {
  const cmp     = tree.ord.compare_
  let n         = tree.root
  let lastValue = O.None<V>()
  while (n) {
    const d = cmp(key, n.key)
    if (d > 0) {
      lastValue = O.Some(n.value)
    }
    if (d <= 0) {
      n = n.left
    } else {
      n = n.right
    }
  }
  return lastValue
}

export function getLt<K>(key: K): <V>(tree: RedBlackTree<K, V>) => Option<V> {
  return (tree) => getLt_(tree, key)
}

export function visitFull<K, V, A>(tree: RedBlackTree<K, V>, visit: (key: K, value: V) => Option<A>): Option<A> {
  let current: RBNode<K, V>                = tree.root
  let stack: Stack<Node<K, V>> | undefined = undefined
  let done                                 = false

  while (!done) {
    if (current) {
      stack   = makeStack(current, stack)
      current = current.left
    } else if (stack) {
      const v = visit(stack.value.key, stack.value.value)
      if (v._tag === 'Some') {
        return v
      }
      current = stack.value.right
      stack   = stack.previous
    } else {
      done = true
    }
  }
  return O.None()
}

/**
 * Iterates through the elements of a `RedBlackTree` inorder, performing the given function for each element
 */
export function foreach_<K, V>(tree: RedBlackTree<K, V>, visit: (key: K, value: V) => void) {
  if (tree.root) {
    visitFull(tree, (k, v) => {
      visit(k, v)
      return O.None()
    })
  }
}

/**
 * Iterates through the elements of a `RedBlackTree` inorder, performing the given function for each element
 */
export function foreach<K, V>(visit: (key: K, value: V) => void): (tree: RedBlackTree<K, V>) => void {
  return (tree) => foreach_(tree, visit)
}

/**
 * Converts a `RedBlackTree` into a sorted `ReadonlyArray`
 */
export function toArray<K, V>(tree: RedBlackTree<K, V>): ReadonlyArray<readonly [K, V]> {
  const as: Array<readonly [K, V]> = []
  foreach_(tree, (k, v) => {
    as.push([k, v])
  })
  return as
}

/**
 * Stateful iterator
 */
class RedBlackTreeIterator<K, V> implements Iterator<readonly [K, V]> {
  private count = 0
  constructor(readonly tree: RedBlackTree<K, V>, readonly stack: Array<Node<K, V>>, readonly direction: 0 | 1) {}

  next(): IteratorResult<readonly [K, V]> {
    if (this.isEmpty) {
      return { done: true, value: this.count }
    }
    this.count++
    const value: readonly [K, V] = [this.stack[this.stack.length - 1].key, this.stack[this.stack.length - 1].value]
    switch (this.direction) {
      case 0: {
        this.moveNext()
        break
      }
      case 1: {
        this.movePrev()
        break
      }
    }
    return { done: false, value }
  }

  get isEmpty(): boolean {
    return this.stack.length === 0
  }

  /**
   * Returns the current node
   */
  get node(): RBNode<K, V> {
    if (this.isEmpty) {
      return Leaf
    }
    return this.stack[this.stack.length - 1]
  }

  /**
   * Returns the current key
   */
  get key(): O.Option<K> {
    if (this.isEmpty) {
      return O.None()
    }
    return O.Some(this.node!.key)
  }

  /**
   * Returns the current value
   */
  get value(): O.Option<V> {
    if (this.isEmpty) {
      return O.None()
    }
    return O.Some(this.node!.value)
  }

  /**
   * Returns the current entry
   */
  get entry(): O.Option<readonly [K, V]> {
    if (this.isEmpty) {
      return O.None()
    }
    return O.Some([this.stack[this.stack.length - 1].key, this.stack[this.stack.length - 1].value])
  }

  /**
   * Checks if the iterator has a next element
   */
  get hasNext(): boolean {
    const stack = this.stack
    if (stack.length === 0) {
      return false
    }
    if (stack[stack.length - 1].right) {
      return true
    }
    for (let s = stack.length - 1; s > 0; --s) {
      if (stack[s - 1].left === stack[s]) {
        return true
      }
    }
    return false
  }

  /**
   * Advances the iterator
   */
  moveNext(): void {
    if (this.isEmpty) {
      return
    }
    const stack         = this.stack
    let n: RBNode<K, V> = stack[stack.length - 1]
    if (n.right) {
      n = n.right
      while (n) {
        stack.push(n)
        n = n.left
      }
    } else {
      stack.pop()
      while (stack.length > 0 && stack[stack.length - 1].right === n) {
        n = stack[stack.length - 1]
        stack.pop()
      }
    }
  }

  /**
   * Checks if the iterator has a previous element
   */
  get hasPrev(): boolean {
    const stack = this.stack
    if (stack.length === 0) {
      return false
    }
    if (stack[stack.length - 1].left) {
      return true
    }
    for (let s = stack.length - 1; s > 0; --s) {
      if (stack[s - 1].right === stack[s]) {
        return true
      }
    }
    return false
  }

  /**
   * Retreats the iterator to the previous element
   */
  movePrev(): void {
    const stack = this.stack
    if (stack.length === 0) {
      return
    }
    let n: RBNode<K, V> = stack[stack.length - 1]
    if (n.left) {
      n = n.left
      while (n) {
        stack.push(n)
        n = n.right
      }
    } else {
      stack.pop()
      while (stack.length > 0 && stack[stack.length - 1].left === n) {
        n = stack[stack.length - 1]
        stack.pop()
      }
    }
  }

  /**
   * Returns a `RedBlackTreeIterator` of the same tree, with a cloned stack
   */
  clone(): RedBlackTreeIterator<K, V> {
    return new RedBlackTreeIterator(this.tree, this.stack.slice(), this.direction)
  }

  /**
   * Reverses the direction of the iterator
   */
  reverse(): RedBlackTreeIterator<K, V> {
    return new RedBlackTreeIterator(this.tree, this.stack.slice(), this.direction ? 0 : 1)
  }

  /**
   * Deletes the current element, returing a new `RedBlackTree`
   */
  remove(): RedBlackTree<K, V> {
    const pathStack = this.stack
    if (pathStack.length === 0) {
      return this.tree
    }
    // clone path to node
    const stack: Array<Mutable<Node<K, V>>> = new Array(pathStack.length)
    let n: Mutable<Node<K, V>>              = pathStack[pathStack.length - 1]
    stack[stack.length - 1]                 = Node(n.color, n.left, n.key, n.value, n.right, n.count)
    for (let i = pathStack.length - 2; i >= 0; --i) {
      const n = pathStack[i]
      if (n.left === pathStack[i + 1]) {
        stack[i] = Node(n.color, stack[i + 1], n.key, n.value, n.right, n.count)
      } else {
        stack[i] = Node(n.color, n.left, n.key, n.value, stack[i + 1], n.count)
      }
    }

    // get node
    n = stack[stack.length - 1]

    // if not leaf, then swap with previous node
    if (n.left && n.right) {
      // first walk to previous leaf
      const split = stack.length
      n           = n.left
      while (n.right) {
        stack.push(n)
        n = n.right
      }
      // clone path to leaf
      const v = stack[split - 1]
      stack.push(Node(n.color, n.left, v.key, v.value, n.right, n.count))
      stack[split - 1].key   = n.key
      stack[split - 1].value = n.value

      // fix stack
      for (let i = stack.length - 2; i >= split; --i) {
        n        = stack[i]
        stack[i] = Node(n.color, n.left, n.key, n.value, stack[i + 1], n.count)
      }
      stack[split - 1].left = stack[split]
    }
    n = stack[stack.length - 1]
    if (n.color === R) {
      // removing red leaf
      const p = stack[stack.length - 2]
      if (p.left === n) {
        p.left = null
      } else if (p.right === n) {
        p.right = null
      }
      stack.pop()
      for (let i = 0; i < stack.length; ++i) {
        stack[i].count--
      }
      return new RedBlackTree(this.tree.ord, stack[0])
    } else {
      if (n.left || n.right) {
        // single child black parent
        // black single child
        if (n.left) {
          swapNode(n, n.left)
        } else if (n.right) {
          swapNode(n, n.right)
        }
        //Child must be red, so repaint it black to balance color
        n.color = B
        for (let i = 0; i < stack.length - 1; ++i) {
          stack[i].count--
        }
        return new RedBlackTree(this.tree.ord, stack[0])
      } else if (stack.length === 1) {
        // root
        return new RedBlackTree(this.tree.ord, null)
      } else {
        // black leaf no children
        for (let i = 0; i < stack.length; ++i) {
          stack[i].count--
        }
        const parent = stack[stack.length - 2]
        fixDoubleBlack(stack)
        // fix links
        if (parent.left === n) {
          parent.left = null
        } else {
          parent.right = null
        }
      }
    }
    return new RedBlackTree(this.tree.ord, stack[0])
  }
}

export interface RedBlackTreeIterable<K, V> extends Iterable<readonly [K, V]> {
  [Symbol.iterator](): RedBlackTreeIterator<K, V>
}

export function forward<K, V>(tree: RedBlackTree<K, V>): RedBlackTreeIterable<K, V> {
  return {
    [Symbol.iterator]() {
      const stack: Array<Node<K, V>> = []
      let n                          = tree.root
      while (n) {
        stack.push(n)
        n = n.left
      }
      return new RedBlackTreeIterator(tree, stack, 0)
    }
  }
}

export function backward<K, V>(tree: RedBlackTree<K, V>): RedBlackTreeIterable<K, V> {
  return {
    [Symbol.iterator]() {
      const stack: Array<Node<K, V>> = []
      let n                          = tree.root
      while (n) {
        stack.push(n)
        n = n.right
      }
      return new RedBlackTreeIterator(tree, stack, 1)
    }
  }
}

export function find_<K, V>(tree: RedBlackTree<K, V>, key: K, direction: 0 | 1 = 0): RedBlackTreeIterable<K, V> {
  return {
    [Symbol.iterator]() {
      const cmp                      = tree.ord.compare_
      let n                          = tree.root
      const stack: Array<Node<K, V>> = []
      while (n) {
        const d = cmp(key, n.key)
        stack.push(n)
        switch (d) {
          case 0: {
            return new RedBlackTreeIterator(tree, stack, direction)
          }
          case -1: {
            n = n.left
            break
          }
          case 1: {
            n = n!.right
            break
          }
        }
      }
      return new RedBlackTreeIterator(tree, [], direction)
    }
  }
}

export function at_<K, V>(tree: RedBlackTree<K, V>, index: number, direction: 0 | 1 = 0): RedBlackTreeIterable<K, V> {
  return {
    [Symbol.iterator]() {
      if (index < 0 || !tree.root) {
        return new RedBlackTreeIterator(tree, [], direction)
      }
      let idx                        = index
      let n                          = tree.root
      const stack: Array<Node<K, V>> = []
      for (;;) {
        stack.push(n)
        if (n.left) {
          if (index < n.left.count) {
            n = n.left
            continue
          }
          idx -= n.left.count
        }
        if (!idx) {
          return new RedBlackTreeIterator(tree, stack, direction)
        }
        idx -= 1
        if (n.right) {
          if (idx >= n.right.count) {
            break
          }
          n = n.right
        } else {
          break
        }
      }
      return new RedBlackTreeIterator(tree, [], direction)
    }
  }
}

export function at(
  index: number,
  direction: 0 | 1 = 0
): <K, V>(tree: RedBlackTree<K, V>) => RedBlackTreeIterable<K, V> {
  return (tree) => at_(tree, index, direction)
}

/**
 * Finds the first element in the tree whose key is >= the given key
 * @returns An iterator at the found element
 */
export function gte_<K, V>(tree: RedBlackTree<K, V>, key: K, direction: 0 | 1 = 0): RedBlackTreeIterable<K, V> {
  return {
    [Symbol.iterator]() {
      const cmp                      = tree.ord.compare_
      let n: RBNode<K, V>            = tree.root
      const stack: Array<Node<K, V>> = []
      let last_ptr                   = 0
      while (n) {
        const d = cmp(key, n.key)
        stack.push(n)
        if (d <= 0) {
          last_ptr = stack.length
          n        = n.left
        } else {
          n = n.right
        }
      }
      stack.length = last_ptr
      return new RedBlackTreeIterator(tree, stack, direction)
    }
  }
}

/**
 * Finds the first element in the tree whose key is >= the given key
 * @returns An iterator at the found element
 */
export function gte<K>(key: K, direction: 0 | 1 = 0): <V>(tree: RedBlackTree<K, V>) => RedBlackTreeIterable<K, V> {
  return (tree) => gte_(tree, key, direction)
}

/**
 * Finds the first element in the tree whose key is > the given key
 * @returns An iterator at the found element
 */
export function gt_<K, V>(tree: RedBlackTree<K, V>, key: K, direction: 0 | 1 = 0): RedBlackTreeIterable<K, V> {
  return {
    [Symbol.iterator]() {
      const cmp                      = tree.ord.compare_
      let n: RBNode<K, V>            = tree.root
      const stack: Array<Node<K, V>> = []
      let last_ptr                   = 0
      while (n) {
        const d = cmp(key, n.key)
        stack.push(n)
        if (d < 0) {
          last_ptr = stack.length
          n        = n.left
        } else {
          n = n.right
        }
      }
      stack.length = last_ptr
      return new RedBlackTreeIterator(tree, stack, direction)
    }
  }
}

/**
 * Finds the first element in the tree whose key is > the given key
 * @returns An iterator at the found element
 */
export function gt<K>(key: K, direction: 0 | 1 = 0): <V>(tree: RedBlackTree<K, V>) => RedBlackTreeIterable<K, V> {
  return (tree) => gt_(tree, key, direction)
}

/**
 * Finds the first element in the tree whose key is <= the given key
 * @returns An iterator at the found element
 */
export function lte_<K, V>(tree: RedBlackTree<K, V>, key: K, direction: 0 | 1 = 0): RedBlackTreeIterable<K, V> {
  return {
    [Symbol.iterator]() {
      const cmp                      = tree.ord.compare_
      let n: RBNode<K, V>            = tree.root
      const stack: Array<Node<K, V>> = []
      let last_ptr                   = 0
      while (n) {
        const d = cmp(key, n.key)
        stack.push(n)
        if (d >= 0) {
          last_ptr = stack.length
        }
        if (d < 0) {
          n = n.left
        } else {
          n = n.right
        }
      }
      stack.length = last_ptr
      return new RedBlackTreeIterator(tree, stack, direction)
    }
  }
}

/**
 * Finds the first element in the tree whose key is <= the given key
 * @returns An iterator at the found element
 */
export function lte<K>(key: K, direction: 0 | 1 = 0): <V>(tree: RedBlackTree<K, V>) => RedBlackTreeIterable<K, V> {
  return (tree) => lte_(tree, key, direction)
}

/**
 * Finds the first element in the tree whose key is < the given key
 * @returns An iterator at the found element
 */
export function lt_<K, V>(tree: RedBlackTree<K, V>, key: K, direction: 0 | 1 = 0): RedBlackTreeIterable<K, V> {
  return {
    [Symbol.iterator]() {
      const cmp                      = tree.ord.compare_
      let n: RBNode<K, V>            = tree.root
      const stack: Array<Node<K, V>> = []
      let last_ptr                   = 0
      while (n) {
        const d = cmp(key, n.key)
        stack.push(n)
        if (d > 0) {
          last_ptr = stack.length
        }
        if (d <= 0) {
          n = n.left
        } else {
          n = n.right
        }
      }
      stack.length = last_ptr
      return new RedBlackTreeIterator(tree, stack, direction)
    }
  }
}

/**
 * Finds the first element in the tree whose key is < the given key
 * @returns An iterator at the found element
 */
export function lt<K>(key: K, direction: 0 | 1 = 0): <V>(tree: RedBlackTree<K, V>) => RedBlackTreeIterable<K, V> {
  return (tree) => lt_(tree, key, direction)
}

export function blackHeight<K, V>(root: RBNode<K, V>): number {
  if (root === Leaf) {
    return 0
  }
  let n: RBNode<K, V> = root
  let x               = 0
  while (n) {
    n.color === B && x++
    n = n.right
  }
  return x
}

function headNode<K, V>(root: RBNode<K, V>): Option<Node<K, V>> {
  if (root === Leaf) {
    return O.None()
  }
  let n: Node<K, V> = root
  while (n.left) {
    n = n.left
  }
  return O.Some(n)
}

function lastNode<K, V>(root: RBNode<K, V>): Option<Node<K, V>> {
  if (root === Leaf) {
    return O.None()
  }
  let n: Node<K, V> = root
  while (n.right) {
    n = n.right
  }
  return O.Some(n)
}

export function visitLte<K, V, A>(tree: RedBlackTree<K, V>, max: K, visit: (k: K, v: V) => Option<A>): Option<A> {
  let current: RBNode<K, V>                = tree.root
  let stack: Stack<Node<K, V>> | undefined = undefined
  let done                                 = false
  const cmp                                = tree.ord.compare_

  while (!done) {
    if (current) {
      stack   = makeStack(current, stack)
      current = current.left
    } else if (stack) {
      if (cmp(stack.value.key, max) > 0) {
        break
      }
      const v = visit(stack.value.key, stack.value.value)
      if (v._tag === 'Some') {
        return v
      }
      current = stack.value.right
      stack   = stack.previous
    } else {
      done = true
    }
  }
  return O.None()
}

export function foreachLte_<K, V>(tree: RedBlackTree<K, V>, max: K, visit: (k: K, v: V) => void): void {
  if (tree.root) {
    visitLte(tree, max, (k, v) => {
      visit(k, v)
      return O.None()
    })
  }
}

export function foreachLte<K, V>(max: K, visit: (k: K, v: V) => void): (tree: RedBlackTree<K, V>) => void {
  return (tree) => foreachLte_(tree, max, visit)
}

export function visitLt<K, V, A>(tree: RedBlackTree<K, V>, max: K, visit: (k: K, v: V) => Option<A>): Option<A> {
  let current: RBNode<K, V>                = tree.root
  let stack: Stack<Node<K, V>> | undefined = undefined
  let done                                 = false
  const cmp                                = tree.ord.compare_

  while (!done) {
    if (current) {
      stack   = makeStack(current, stack)
      current = current.left
    } else if (stack) {
      if (cmp(stack.value.key, max) >= 0) {
        break
      }
      const v = visit(stack.value.key, stack.value.value)
      if (v._tag === 'Some') {
        return v
      }
      current = stack.value.right
      stack   = stack.previous
    } else {
      done = true
    }
  }
  return O.None()
}

export function foreachLt_<K, V>(tree: RedBlackTree<K, V>, max: K, visit: (k: K, v: V) => void): void {
  if (tree.root) {
    visitLt(tree, max, (k, v) => {
      visit(k, v)
      return O.None()
    })
  }
}

export function foreachLt<K, V>(max: K, visit: (k: K, v: V) => void): (tree: RedBlackTree<K, V>) => void {
  return (tree) => foreachLt_(tree, max, visit)
}

export function visitGte<K, V, A>(tree: RedBlackTree<K, V>, min: K, visit: (k: K, v: V) => Option<A>): Option<A> {
  let current: RBNode<K, V>                = tree.root
  let stack: Stack<Node<K, V>> | undefined = undefined
  let done                                 = false
  const cmp                                = tree.ord.compare_

  while (!done) {
    if (current) {
      stack = makeStack(current, stack)
      if (cmp(current.key, min) >= 0) {
        current = current.left
      } else {
        current = null
      }
    } else if (stack) {
      if (cmp(stack.value.key, min) >= 0) {
        const v = visit(stack.value.key, stack.value.value)
        if (v._tag === 'Some') {
          return v
        }
      }
      current = stack.value.right
      stack   = stack.previous
    } else {
      done = true
    }
  }
  return O.None()
}

export function foreachGte_<K, V>(tree: RedBlackTree<K, V>, min: K, visit: (k: K, v: V) => void): void {
  if (tree.root) {
    visitGte(tree, min, (k, v) => {
      visit(k, v)
      return O.None()
    })
  }
}

export function foreachGte<K, V>(min: K, visit: (k: K, v: V) => void): (tree: RedBlackTree<K, V>) => void {
  return (tree) => foreachGte_(tree, min, visit)
}

export function visitGt<K, V, A>(tree: RedBlackTree<K, V>, min: K, visit: (k: K, v: V) => Option<A>): Option<A> {
  let current: RBNode<K, V>                = tree.root
  let stack: Stack<Node<K, V>> | undefined = undefined
  let done                                 = false
  const cmp                                = tree.ord.compare_

  while (!done) {
    if (current) {
      stack = makeStack(current, stack)
      if (cmp(current.key, min) > 0) {
        current = current.left
      } else {
        current = null
      }
    } else if (stack) {
      if (cmp(stack.value.key, min) > 0) {
        const v = visit(stack.value.key, stack.value.value)
        if (v._tag === 'Some') {
          return v
        }
      }
      current = stack.value.right
      stack   = stack.previous
    } else {
      done = true
    }
  }
  return O.None()
}

export function foreachGt_<K, V>(tree: RedBlackTree<K, V>, min: K, visit: (k: K, v: V) => void): void {
  if (tree.root) {
    visitGt(tree, min, (k, v) => {
      visit(k, v)
      return O.None()
    })
  }
}

export function foreachGt<K, V>(min: K, visit: (k: K, v: V) => void): (tree: RedBlackTree<K, V>) => void {
  return (tree) => foreachGt_(tree, min, visit)
}

export function visitBetween<K, V, A>(
  tree: RedBlackTree<K, V>,
  min: K,
  max: K,
  visit: (k: K, v: V) => Option<A>
): Option<A> {
  let current: RBNode<K, V>                = tree.root
  let stack: Stack<Node<K, V>> | undefined = undefined
  let done                                 = false
  const cmp                                = tree.ord.compare_

  while (!done) {
    if (current) {
      stack = makeStack(current, stack)
      if (cmp(current.key, min) > 0) {
        current = current.left
      } else {
        current = null
      }
    } else if (stack) {
      if (cmp(stack.value.key, max) >= 0) {
        break
      }
      const v = visit(stack.value.key, stack.value.value)
      if (v._tag === 'Some') {
        return v
      }
      current = stack.value.right
      stack   = stack.previous
    } else {
      done = true
    }
  }
  return O.None()
}

export function foreachBetween_<K, V>(tree: RedBlackTree<K, V>, min: K, max: K, visit: (k: K, v: V) => void): void {
  if (tree.root) {
    visitBetween(tree, min, max, (k, v) => {
      visit(k, v)
      return O.None()
    })
  }
}

export function foreachBetween<K, V>(min: K, max: K, visit: (k: K, v: V) => void): (tree: RedBlackTree<K, V>) => void {
  return (tree) => foreachBetween_(tree, min, max, visit)
}

/**
 * Returns an iterable of all the values in the tree in sorted order
 */
export function values_<K, V>(tree: RedBlackTree<K, V>, direction: 0 | 1 = 0): Iterable<V> {
  return {
    *[Symbol.iterator]() {
      const iter: Iterator<readonly [K, V]> = direction
        ? backward(tree)[Symbol.iterator]()
        : forward(tree)[Symbol.iterator]()
      let d: IteratorResult<readonly [K, V]>
      while (!(d = iter.next()).done) {
        yield d.value[1]
      }
    }
  }
}

/**
 * Returns an iterable of all the values in the tree in sorted order
 */
export function values(direction: 0 | 1 = 0): <K, V>(tree: RedBlackTree<K, V>) => Iterable<V> {
  return (tree) => values_(tree, direction)
}

/**
 * Returns an iterable of all the keys in the tree in sorted order
 */
export function keys_<K, V>(tree: RedBlackTree<K, V>, direction: 0 | 1 = 0): Iterable<K> {
  return {
    *[Symbol.iterator]() {
      const iter: Iterator<readonly [K, V]> = direction
        ? backward(tree)[Symbol.iterator]()
        : forward(tree)[Symbol.iterator]()
      let d: IteratorResult<readonly [K, V]>
      while (!(d = iter.next()).done) {
        yield d.value[0]
      }
    }
  }
}

/**
 * Returns an iterable of all the keys in the tree in sorted order
 */
export function keys(direction: 0 | 1 = 0): <K, V>(tree: RedBlackTree<K, V>) => Iterable<K> {
  return (tree) => keys_(tree, direction)
}

/**
 * Returns a range of the tree with keys >= min and < max
 */
export function range_<K, V>(tree: RedBlackTree<K, V>, min: Option<K>, max: Option<K>): RedBlackTree<K, V> {
  let r = make<K, V>(tree.ord)
  if (min._tag === 'Some') {
    if (max._tag === 'Some') {
      foreachBetween_(tree, min.value, max.value, (k, v) => {
        r = insert_(r, k, v)
      })
    } else {
      foreachGte_(tree, min.value, (k, v) => {
        r = insert_(r, k, v)
      })
    }
  } else if (max._tag === 'Some') {
    foreachLt_(tree, max.value, (k, v) => {
      r = insert_(r, k, v)
    })
  }
  return r
}

/**
 * Returns a range of the tree with keys >= min and < max
 */
export function range<K>(min: Option<K>, max: Option<K>): <V>(tree: RedBlackTree<K, V>) => RedBlackTree<K, V> {
  return (tree) => range_(tree, min, max)
}

/*
 * -------------------------------------------
 * Internal
 * -------------------------------------------
 */

type Color = 0 | 1

const R: Color = 0
const B: Color = 1

type Leaf = null

const Leaf = null

type Mutable<T> = { -readonly [K in keyof T]: T[K] }

interface Node<K, V> {
  readonly color: Color
  readonly key: K
  readonly value: V
  readonly left: RBNode<K, V>
  readonly right: RBNode<K, V>
  readonly count: number
}

function Node<K, V>(
  color: Color,
  left: Node<K, V> | Leaf,
  key: K,
  value: V,
  right: Node<K, V> | Leaf,
  count: number
): Node<K, V> {
  return {
    color,
    left,
    key,
    value,
    right,
    count
  }
}

type RBNode<K, V> = Node<K, V> | Leaf

function swapNode<K, V>(node: Mutable<Node<K, V>>, v: Node<K, V>): void {
  node.key   = v.key
  node.value = v.value
  node.left  = v.left
  node.right = v.right
  node.color = v.color
  node.count = v.count
}

function isEmptyNode<K, V>(node: RBNode<K, V>): node is Leaf {
  return node === null
}

function repaintNode<K, V>(n: RBNode<K, V>, c: Color): RBNode<K, V> {
  return n === Leaf ? Leaf : Node(c, n.left, n.key, n.value, n.right, n.count)
}

function cloneNode<K, V>(n: RBNode<K, V>): RBNode<K, V> {
  return n === Leaf ? Leaf : Node(n.color, n.left, n.key, n.value, n.right, n.count)
}

function recountNode<K, V>(n: Mutable<Node<K, V>>): void {
  n.count = 1 + (n.left ? n.left.count : 0) + (n.right ? n.right.count : 0)
}

function rebuildModifiedPath<K, V>(nodeStack: Array<Mutable<Node<K, V>>>, orderStack: Array<1 | -1>, inc = 1): void {
  for (let s = nodeStack.length - 2; s >= 0; --s) {
    const n = nodeStack[s]
    switch (orderStack[s]) {
      case -1: {
        nodeStack[s] = Node(n.color, nodeStack[s + 1], n.key, n.value, n.right, n.count + inc)
        break
      }
      case 1: {
        nodeStack[s] = Node(n.color, n.left, n.key, n.value, nodeStack[s + 1], n.count + inc)
        break
      }
    }
  }
}

function balanceModifiedPath<K, V>(nodeStack: Array<Mutable<Node<K, V>>>): void {
  for (let s = nodeStack.length - 1; s > 1; --s) {
    const parent = nodeStack[s - 1]
    const node   = nodeStack[s]
    if (parent.color === B || node.color === B) {
      break
    }
    const gparent = nodeStack[s - 2]
    if (gparent.left === parent) {
      if (parent.left === node) {
        const parsib = gparent.right
        if (parsib && parsib.color === R) {
          parent.color  = B
          gparent.right = repaintNode(parsib, B)
          gparent.color = R
          s            -= 1
        } else {
          gparent.color    = R
          gparent.left     = parent.right
          parent.color     = B
          parent.right     = gparent
          nodeStack[s - 2] = parent
          nodeStack[s - 1] = node
          recountNode(gparent)
          recountNode(parent)
          if (s >= 3) {
            const ggparent = nodeStack[s - 3]
            if (ggparent.left === gparent) {
              ggparent.left = parent
            } else {
              ggparent.right = parent
            }
          }
          break
        }
      } else {
        const uncle = gparent.right
        if (uncle && uncle.color === R) {
          parent.color  = B
          gparent.right = repaintNode(uncle, B)
          gparent.color = R
          s            -= 1
        } else {
          parent.right     = node.left
          gparent.color    = R
          gparent.left     = node.right
          node.color       = B
          node.left        = parent
          node.right       = gparent
          nodeStack[s - 2] = node
          nodeStack[s - 1] = parent
          recountNode(gparent)
          recountNode(parent)
          recountNode(node)
          if (s >= 3) {
            const ggparent = nodeStack[s - 3]
            if (ggparent.left === gparent) {
              ggparent.left = node
            } else {
              ggparent.right = node
            }
          }
          break
        }
      }
    } else {
      if (parent.right === node) {
        const parsib = gparent.left
        if (parsib && parsib.color === R) {
          parent.color  = B
          gparent.left  = repaintNode(parsib, B)
          gparent.color = R
          s            -= 1
        } else {
          gparent.color    = R
          gparent.right    = parent.left
          parent.color     = B
          parent.left      = gparent
          nodeStack[s - 2] = parent
          nodeStack[s - 1] = node
          recountNode(gparent)
          recountNode(parent)
          if (s >= 3) {
            const ggparent = nodeStack[s - 3]
            if (ggparent.right === gparent) {
              ggparent.right = parent
            } else {
              ggparent.left = parent
            }
          }
          break
        }
      } else {
        const parsib = gparent.left
        if (parsib && parsib.color === R) {
          parent.color  = B
          gparent.left  = repaintNode(parsib, B)
          gparent.color = R
          s            -= 1
        } else {
          parent.left      = node.right
          gparent.color    = R
          gparent.right    = node.left
          node.color       = B
          node.right       = parent
          node.left        = gparent
          nodeStack[s - 2] = node
          nodeStack[s - 1] = parent
          recountNode(gparent)
          recountNode(parent)
          recountNode(node)
          if (s >= 3) {
            const ggparent = nodeStack[s - 3]
            if (ggparent.right === gparent) {
              ggparent.right = node
            } else {
              ggparent.left = node
            }
          }
          break
        }
      }
    }
  }
  nodeStack[0].color = B
}

function fixDoubleBlack<K, V>(stack: Array<Mutable<Node<K, V>>>): void {
  let node: Mutable<Node<K, V>>,
    parent: Mutable<Node<K, V>>,
    sibling: Mutable<RBNode<K, V>>,
    nibling: Mutable<RBNode<K, V>>
  for (let i = stack.length - 1; i >= 0; --i) {
    node = stack[i]
    if (i === 0) {
      node.color = B
      return
    }
    parent = stack[i - 1]
    if (parent.left === node) {
      // left child
      sibling = parent.right
      if (sibling && sibling.right && sibling.right.color === R) {
        // right sibling child red
        sibling        = parent.right = cloneNode(sibling)
        nibling        = sibling!.right = cloneNode(sibling!.right)
        parent.right   = sibling!.left
        sibling!.left  = parent
        sibling!.right = nibling
        sibling!.color = parent.color
        node.color     = B
        parent.color   = B
        nibling!.color = B
        recountNode(parent)
        recountNode(sibling!)
        if (i > 1) {
          const pp = stack[i - 2]
          if (pp.left === parent) {
            pp.left = sibling
          } else {
            pp.right = sibling
          }
        }
        stack[i - 1] = sibling!
        return
      } else if (sibling && sibling.left && sibling.left.color === R) {
        // left sibling child red
        sibling        = parent.right = cloneNode(sibling)
        nibling        = sibling!.left = cloneNode(sibling!.left)
        parent.right   = nibling!.left
        sibling!.left  = nibling!.right
        nibling!.left  = parent
        nibling!.right = sibling
        nibling!.color = parent.color
        parent.color   = B
        sibling!.color = B
        node.color     = B
        recountNode(parent)
        recountNode(sibling!)
        recountNode(nibling!)
        if (i > 1) {
          const pp = stack[i - 2]
          if (pp.left === parent) {
            pp.left = nibling
          } else {
            pp.right = nibling
          }
        }
        stack[i - 1] = nibling!
        return
      }
      if (sibling!.color === B) {
        if (parent.color === R) {
          // black sibling, red parent
          parent.color = B
          parent.right = repaintNode(sibling!, R)
          return
        } else {
          // black sibling, black parent
          parent.right = repaintNode(sibling!, R)
          continue
        }
      } else {
        // red sibling
        sibling        = cloneNode(sibling)
        parent.right   = sibling!.left
        sibling!.left  = parent
        sibling!.color = parent.color
        parent!.color  = R
        recountNode(parent)
        recountNode(sibling!)
        if (i > 1) {
          const pp = stack[i - 2]
          if (pp.left === parent) {
            pp.left = sibling
          } else {
            pp.right = sibling
          }
        }
        stack[i - 1] = sibling!
        stack[i]     = parent
        if (i + 1 < stack.length) {
          stack[i + 1] = node
        } else {
          stack.push(node)
        }
        i += 2
      }
    } else {
      // right child
      sibling = parent.left
      if (sibling && sibling.left && sibling.left.color === R) {
        // left sibling child red
        sibling        = parent.left = cloneNode(sibling)
        nibling        = sibling!.left = cloneNode(sibling!.left)
        parent.left    = sibling!.right
        sibling!.right = parent
        sibling!.left  = nibling
        sibling!.color = parent.color
        node.color     = B
        parent.color   = B
        nibling!.color = B
        recountNode(parent)
        recountNode(sibling!)
        if (i > 1) {
          const pp = stack[i - 2]
          if (pp.right === parent) {
            pp.right = sibling
          } else {
            pp.left = sibling
          }
        }
        stack[i - 1] = sibling!
        return
      } else if (sibling && sibling.right && sibling.right.color === R) {
        // right sibling child red
        sibling        = parent.left = cloneNode(sibling)
        nibling        = sibling!.right = cloneNode(sibling!.right)
        parent.left    = nibling!.right
        sibling!.right = nibling!.left
        nibling!.right = parent
        nibling!.left  = sibling
        nibling!.color = parent.color
        parent.color   = B
        sibling!.color = B
        node.color     = B
        recountNode(parent)
        recountNode(sibling!)
        recountNode(nibling!)
        if (i > 1) {
          const pp = stack[i - 2]
          if (pp.right === parent) {
            pp.right = nibling
          } else {
            pp.left = nibling
          }
        }
        stack[i - 1] = nibling!
        return
      }
      if (sibling!.color === B) {
        if (parent.color === R) {
          // black sibling, red parent
          parent.color = B
          parent.left  = repaintNode(sibling!, R)
          return
        } else {
          // black sibling, black, parent
          parent.left = repaintNode(sibling!, R)
          continue
        }
      } else {
        // red sibling
        sibling        = cloneNode(sibling)
        parent.left    = sibling!.right
        sibling!.right = parent
        sibling!.color = parent.color
        parent.color   = R
        recountNode(parent)
        recountNode(sibling!)
        if (i > 1) {
          const pp = stack[i - 2]
          if (pp.right === parent) {
            pp.right = sibling
          } else {
            pp.left = sibling
          }
        }
        stack[i - 1] = sibling!
        stack[i]     = parent
        if (i + 1 < stack.length) {
          stack[i + 1] = node
        } else {
          stack.push(node)
        }
        i += 2
      }
    }
  }
}
