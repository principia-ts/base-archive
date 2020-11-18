import { identity } from "../Function";
import { iterable } from "./utils";

/*
 * -------------------------------------------
 * Monad Iterable
 * -------------------------------------------
 */

export function chain<A, B>(f: (a: A) => Iterable<B>): (ma: Iterable<A>) => Iterable<B> {
  return (ma) => chain_(ma, f);
}

export function chain_<A, B>(ma: Iterable<A>, f: (a: A) => Iterable<B>): Iterable<B> {
  return iterable(function* () {
    yield* genChain(ma[Symbol.iterator](), f);
  });
}

export function flatten<A>(mma: Iterable<Iterable<A>>): Iterable<A> {
  return chain_(mma, identity);
}

function* genChain<A, B>(ia: Iterator<A>, f: (a: A) => Iterable<B>) {
  while (true) {
    const result = ia.next();
    if (result.done) {
      break;
    }
    const ib = f(result.value)[Symbol.iterator]();
    while (true) {
      const result = ib.next();
      if (result.done) {
        break;
      }
      yield result.value;
    }
  }
}
