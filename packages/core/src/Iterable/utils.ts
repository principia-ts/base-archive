export function iterable<A>(iterator: () => IterableIterator<A>): Iterable<A> {
  return {
    [Symbol.iterator]() {
      return iterator();
    }
  };
}
