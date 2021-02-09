/**
 * A persistent red-black tree implementation with iterative, stack-safe operations
 *
 * Forked from https://github.com/mikolalysenko/functional-red-black-tree
 */

import type { Option } from './Option'
import type { CombineFn_, CompareFn_, Ord, Semigroup } from './typeclass'

import * as O from './Option'

export class RedBlackTree<K, V> implements Iterable<readonly [K, V]> {
  constructor(readonly ord: Ord<K>, readonly root: Node<K, V> | Leaf) {}

  [Symbol.iterator](): RedBlackTreeIterator<K, V> {
    return at_(this, 0)
  }
}

export function insert_<K, V>(tree: RedBlackTree<K, V>, key: K, value: V): RedBlackTree<K, V> {
  return new RedBlackTree(tree.ord, ins(tree.ord.compare_, tree.root, key, value))
}

export function insert<K, V>(key: K, value: V): (tree: RedBlackTree<K, V>) => RedBlackTree<K, V> {
  return (tree) => insert_(tree, key, value)
}

export function insertWith_<V>(S: Semigroup<V>): <K>(tree: RedBlackTree<K, V>, key: K, value: V) => RedBlackTree<K, V> {
  return (tree, key, value) => new RedBlackTree(tree.ord, insWith(tree.ord.compare_, S.combine_, tree.root, key, value))
}

export function insertWith<V>(
  S: Semigroup<V>
): <K>(key: K, value: V) => (tree: RedBlackTree<K, V>) => RedBlackTree<K, V> {
  const insertWithS_ = insertWith_(S)
  return (key, value) => (tree) => insertWithS_(tree, key, value)
}

export function head<K, V>(tree: RedBlackTree<K, V>): Option<V> {
  return O.map_(headNode(tree.root), (n) => n.value)
}

export function last<K, V>(tree: RedBlackTree<K, V>): Option<V> {
  return O.map_(lastNode(tree.root), (n) => n.value)
}

export function remove_<K, V>(tree: RedBlackTree<K, V>, key: K): RedBlackTree<K, V> {
  const iter = find(tree.ord.compare_, tree.root, key)
  return iter.isEmpty ? tree : new RedBlackTree(tree.ord, iter.remove())
}

export function remove<K>(key: K): <V>(tree: RedBlackTree<K, V>) => RedBlackTree<K, V> {
  return (tree) => remove_(tree, key)
}

export function get_<K, V>(tree: RedBlackTree<K, V>, key: K): Option<V> {
  const cmp = tree.ord.compare_
  let n     = tree.root
  while (n) {
    const d = cmp(key, n.key)
    switch (d) {
      case 0: {
        return O.some(n.value)
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
  return O.none()
}

export function get<K>(key: K): <V>(tree: RedBlackTree<K, V>) => Option<V> {
  return (tree) => get_(tree, key)
}

export function at_<K, V>(tree: RedBlackTree<K, V>, index: number): RedBlackTreeIterator<K, V> {
  if (index < 0 || !tree.root) {
    return new RedBlackTreeIterator(tree.ord.compare_, tree.root, [])
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
      return new RedBlackTreeIterator(tree.ord.compare_, tree.root, stack)
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
  return new RedBlackTreeIterator(tree.ord.compare_, tree.root, [])
}

export function at(index: number): <K, V>(tree: RedBlackTree<K, V>) => RedBlackTreeIterator<K, V> {
  return (tree) => at_(tree, index)
}

export function gte_<K, V>(tree: RedBlackTree<K, V>, key: K): RedBlackTreeIterator<K, V> {
  const cmp                      = tree.ord.compare_
  let n: RBTree<K, V>            = tree.root
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
  return new RedBlackTreeIterator(cmp, tree.root, stack)
}

export function gte<K>(key: K): <V>(tree: RedBlackTree<K, V>) => RedBlackTreeIterator<K, V> {
  return (tree) => gte_(tree, key)
}

export function gt_<K, V>(tree: RedBlackTree<K, V>, key: K): RedBlackTreeIterator<K, V> {
  const cmp                      = tree.ord.compare_
  let n: RBTree<K, V>            = tree.root
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
  return new RedBlackTreeIterator(cmp, tree.root, stack)
}

export function gt<K>(key: K): <V>(tree: RedBlackTree<K, V>) => RedBlackTreeIterator<K, V> {
  return (tree) => gte_(tree, key)
}

export function lte_<K, V>(tree: RedBlackTree<K, V>, key: K): RedBlackTreeIterator<K, V> {
  const cmp                      = tree.ord.compare_
  let n: RBTree<K, V>            = tree.root
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
  return new RedBlackTreeIterator(cmp, tree.root, stack)
}

export function lte<K>(key: K): <V>(tree: RedBlackTree<K, V>) => RedBlackTreeIterator<K, V> {
  return (tree) => lte_(tree, key)
}

export function lt_<K, V>(tree: RedBlackTree<K, V>, key: K): RedBlackTreeIterator<K, V> {
  const cmp                      = tree.ord.compare_
  let n: RBTree<K, V>            = tree.root
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
  return new RedBlackTreeIterator(cmp, tree.root, stack)
}

export function lt<K>(key: K): <V>(tree: RedBlackTree<K, V>) => RedBlackTreeIterator<K, V> {
  return (tree) => lt_(tree, key)
}

/*
 * -------------------------------------------
 * Implementation
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
  readonly left: RBTree<K, V>
  readonly right: RBTree<K, V>
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

type RBTree<K, V> = Node<K, V> | Leaf

class RedBlackTreeIterator<K, V> implements Iterator<readonly [K, V]> {
  constructor(readonly cmp: CompareFn_<K>, readonly root: RBTree<K, V>, readonly stack: Array<Node<K, V>>) {}
  get isEmpty(): boolean {
    return this.stack.length === 0
  }
  get node(): RBTree<K, V> {
    if (this.isEmpty) {
      return Leaf
    }
    return this.stack[this.stack.length - 1]
  }
  get key(): O.Option<K> {
    if (this.isEmpty) {
      return O.none()
    }
    return O.some(this.node!.key)
  }
  get value(): O.Option<V> {
    if (this.isEmpty) {
      return O.none()
    }
    return O.some(this.node!.value)
  }
  next(): IteratorResult<readonly [K, V]> {
    if (this.isEmpty) {
      return { done: true, value: null }
    }
    const value: readonly [K, V] = [this.node!.key, this.node!.value]
    let done: boolean
    if (this.hasNext) {
      done = false
      this._next()
    } else {
      done = true
    }
    return { done, value }
  }
  get hasNext(): boolean {
    if (this.isEmpty) {
      return false
    }
    const stack = this.stack
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
  private _next(): void {
    if (this.isEmpty) {
      return
    }
    const stack         = this.stack
    let n: RBTree<K, V> = stack[stack.length - 1]
    if (n.right) {
      n = n.right
      while (n) {
        stack.push(n)
        n = n.left
      }
    } else {
      stack.pop()
      while (!this.isEmpty && stack[stack.length - 1] === n) {
        n = stack[stack.length - 1]
        stack.pop()
      }
    }
  }
  clone(): RedBlackTreeIterator<K, V> {
    return new RedBlackTreeIterator(this.cmp, this.root, this.stack.slice())
  }
  remove(): RBTree<K, V> {
    const pathStack = this.stack
    if (pathStack.length === 0) {
      return this.root
    }
    // clone path to node
    const stack: Array<Mutable<Node<K, V>>> = new Array(pathStack.length)
    let n: Mutable<Node<K, V>>              = pathStack[pathStack.length - 1]
    stack[stack.length - 1]                 = Node(n.color, n.left, n.key, n.value, n.right, n.count)
    for (var i = pathStack.length - 2; i >= 0; --i) {
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
      for (var i = stack.length - 2; i >= split; --i) {
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
      return stack[0]
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
        for (var i = 0; i < stack.length - 1; ++i) {
          stack[i].count--
        }
        return stack[0]
      } else if (stack.length === 1) {
        // root
        return null
      } else {
        // black leaf no children
        for (var i = 0; i < stack.length; ++i) {
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
    return stack[0]
  }
}

function swapNode<K, V>(n: Mutable<Node<K, V>>, v: Node<K, V>): void {
  n.key   = v.key
  n.value = v.value
  n.left  = v.left
  n.right = v.right
  n.color = v.color
  n.count = v.count
}

function isEmpty<K, V>(tree: RBTree<K, V>): tree is Leaf {
  return tree === null
}

function repaint<K, V>(n: RBTree<K, V>, c: Color): RBTree<K, V> {
  return n === Leaf ? Leaf : Node(c, n.left, n.key, n.value, n.right, n.count)
}

function cloneNode<K, V>(n: RBTree<K, V>): RBTree<K, V> {
  return n === Leaf ? Leaf : Node(n.color, n.left, n.key, n.value, n.right, n.count)
}

function recount<K, V>(n: Mutable<Node<K, V>>): void {
  n.count = 1 + (n.left ? n.left.count : 0) + (n.right ? n.right.count : 0)
}

/**
 * Insert ignoring duplicates
 */
function ins<K, V>(cmp: CompareFn_<K>, root: RBTree<K, V>, key: K, value: V): RBTree<K, V> {
  if (isEmpty(root)) {
    return Node(R, Leaf, key, value, Leaf, 1)
  }
  const nodeStack: Array<Mutable<Node<K, V>>> = []
  const orderStack: Array<1 | -1>             = []
  let n: RBTree<K, V>                         = root
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
        return root
      }
    }
  }

  nodeStack.push(Node(R, Leaf, key, value, Leaf, 1))
  rebuildModifiedPath(nodeStack, orderStack)
  balanceModifiedPath(nodeStack)

  return nodeStack[0]
}

/**
 * Insert combining duplicates
 */
function insWith<K, V>(cmp: CompareFn_<K>, com: CombineFn_<V>, root: RBTree<K, V>, key: K, value: V): RBTree<K, V> {
  if (isEmpty(root)) {
    return Node(R, Leaf, key, value, Leaf, 1)
  }
  const nodeStack: Array<Mutable<Node<K, V>>> = []
  const orderStack: Array<1 | -1>             = []
  let n: RBTree<K, V>                         = root
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
  return nodeStack[0]
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
          gparent.right = repaint(parsib, B)
          gparent.color = R
          s            -= 1
        } else {
          gparent.color    = R
          gparent.left     = parent.right
          parent.color     = B
          parent.right     = gparent
          nodeStack[s - 2] = parent
          nodeStack[s - 1] = node
          recount(gparent)
          recount(parent)
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
          gparent.right = repaint(uncle, B)
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
          recount(gparent)
          recount(parent)
          recount(node)
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
          gparent.left  = repaint(parsib, B)
          gparent.color = R
          s            -= 1
        } else {
          gparent.color    = R
          gparent.right    = parent.left
          parent.color     = B
          parent.left      = gparent
          nodeStack[s - 2] = parent
          nodeStack[s - 1] = node
          recount(gparent)
          recount(parent)
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
          gparent.left  = repaint(parsib, B)
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
          recount(gparent)
          recount(parent)
          recount(node)
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

function headNode<K, V>(root: RBTree<K, V>): Option<Node<K, V>> {
  if (root === Leaf) {
    return O.none()
  }
  let n: Node<K, V> = root
  while (n.left) {
    n = n.left
  }
  return O.some(n)
}

function lastNode<K, V>(root: RBTree<K, V>): Option<Node<K, V>> {
  if (root === Leaf) {
    return O.none()
  }
  let n: Node<K, V> = root
  while (n.right) {
    n = n.right
  }
  return O.some(n)
}

function find<K, V>(cmp: CompareFn_<K>, root: RBTree<K, V>, key: K): RedBlackTreeIterator<K, V> {
  let n                          = root
  const stack: Array<Node<K, V>> = []
  while (n) {
    const d = cmp(key, n.key)
    stack.push(n)
    switch (d) {
      case 0: {
        return new RedBlackTreeIterator(cmp, root, stack)
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
  return new RedBlackTreeIterator(cmp, root, [])
}

function fixDoubleBlack<K, V>(stack: Array<Mutable<Node<K, V>>>): void {
  let node: Mutable<Node<K, V>>,
    parent: Mutable<Node<K, V>>,
    sibling: Mutable<RBTree<K, V>>,
    nibling: Mutable<RBTree<K, V>>
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
        recount(parent)
        recount(sibling!)
        if (i > 1) {
          var pp = stack[i - 2]
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
        recount(parent)
        recount(sibling!)
        recount(nibling!)
        if (i > 1) {
          var pp = stack[i - 2]
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
          parent.right = repaint(sibling!, R)
          return
        } else {
          // black sibling, black parent
          parent.right = repaint(sibling!, R)
          continue
        }
      } else {
        // red sibling
        sibling        = cloneNode(sibling)
        parent.right   = sibling!.left
        sibling!.left  = parent
        sibling!.color = parent.color
        parent!.color  = R
        recount(parent)
        recount(sibling!)
        if (i > 1) {
          var pp = stack[i - 2]
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
        recount(parent)
        recount(sibling!)
        if (i > 1) {
          var pp = stack[i - 2]
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
        recount(parent)
        recount(sibling!)
        recount(nibling!)
        if (i > 1) {
          var pp = stack[i - 2]
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
          parent.left  = repaint(sibling!, R)
          return
        } else {
          // black sibling, black, parent
          parent.left = repaint(sibling!, R)
          continue
        }
      } else {
        // red sibling
        sibling        = cloneNode(sibling)
        parent.left    = sibling!.right
        sibling!.right = parent
        sibling!.color = parent.color
        parent.color   = R
        recount(parent)
        recount(sibling!)
        if (i > 1) {
          var pp = stack[i - 2]
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

export function blackHeight<K, V>(root: RBTree<K, V>): number {
  if (root === Leaf) {
    return 0
  }
  let n: RBTree<K, V> = root
  let x               = 0
  while (n) {
    n.color === B && x++
    n = n.right
  }
  return x
}
