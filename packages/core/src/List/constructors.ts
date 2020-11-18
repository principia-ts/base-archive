import { emptyAffix, push } from "./_internal";
import type { MutableList } from "./model";
import { List } from "./model";

/**
 * @internal
 */
export function emptyPushable<A>(): MutableList<A> {
  return new List(0, 0, 0, [], undefined, []) as any;
}

/**
 * Creates a list of the given elements.
 *
 * @complexity O(n)
 * @category Constructors
 */
export function list<A>(...elements: A[]): List<A> {
  const l = emptyPushable<A>();
  for (const element of elements) {
    push(element, l);
  }
  return l;
}

/**
 * Creates an empty list.
 *
 * @complexity O(1)
 * @category Constructors
 */
export function empty<A = any>(): List<A> {
  return new List(0, 0, 0, emptyAffix, undefined, emptyAffix);
}

/**
 * Takes a single arguments and returns a singleton list that contains it.
 *
 * @complexity O(1)
 * @category Constructors
 */
export function of<A>(a: A): List<A> {
  return list(a);
}

/**
 * Takes two arguments and returns a list that contains them.
 *
 * @complexity O(1)
 * @category Constructors
 */
export function pair<A>(first: A, second: A): List<A> {
  return new List(2, 0, 2, emptyAffix, undefined, [first, second]);
}

/**
 * Converts an array, an array-like, or an iterable into a list.
 *
 * @complexity O(n)
 * @category Constructors
 */
export function from<A>(sequence: A[] | ArrayLike<A> | Iterable<A>): List<A>;
export function from<A>(sequence: any): List<A> {
  const l = emptyPushable<A>();
  if (sequence.length > 0 && (sequence[0] !== undefined || 0 in sequence)) {
    for (let i = 0; i < sequence.length; ++i) {
      push(sequence[i], l);
    }
  } else if (Symbol.iterator in sequence) {
    const iterator = sequence[Symbol.iterator]();
    let cur;
    // tslint:disable-next-line:no-conditional-assignment
    while (!(cur = iterator.next()).done) {
      push(cur.value, l);
    }
  }
  return l;
}

/**
 * Returns a list of numbers between an inclusive lower bound and an exclusive upper bound.
 *
 * @complexity O(n)
 * @category Constructors
 */
export function range(start: number, end: number): List<number> {
  const list = emptyPushable<number>();
  for (let i = start; i < end; ++i) {
    push(i, list);
  }
  return list;
}

/**
 * Returns a list of a given length that contains the specified value
 * in all positions.
 *
 * @complexity O(n)
 * @category Constructors
 */
export function repeat<A>(value: A, times: number): List<A> {
  let t = times;
  const l = emptyPushable<A>();
  while (--t >= 0) {
    push(value, l);
  }
  return l;
}

/**
 * Generates a new list by calling a function with the current index
 * `n` times.
 *
 * @complexity O(n)
 * @category Constructors
 */
export function times<A>(func: (index: number) => A, times: number): List<A> {
  const l = emptyPushable<A>();
  for (let i = 0; i < times; i++) {
    push(func(i), l);
  }
  return l;
}
