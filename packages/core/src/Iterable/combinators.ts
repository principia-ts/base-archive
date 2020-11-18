import { iterable } from "./utils";

function* genConcat<A>(ia: Iterator<A>, ib: Iterator<A>) {
  while (true) {
    const result = ia.next();
    if (result.done) {
      break;
    }
    yield result.value;
  }
  while (true) {
    const result = ib.next();
    if (result.done) {
      break;
    }
    yield result.value;
  }
}

export function concat_<A>(fa: Iterable<A>, fb: Iterable<A>): Iterable<A> {
  return {
    [Symbol.iterator]: () => genConcat(fa[Symbol.iterator](), fb[Symbol.iterator]())
  };
}

export function take_<A>(fa: Iterable<A>, n: number): Iterable<A> {
  return iterable(function* () {
    const ia = fa[Symbol.iterator]();

    for (let i = 0; i <= n; i++) {
      const el = ia.next();
      if (el.done) break;
      yield el.value;
    }
  });
}

export function take(n: number): <A>(fa: Iterable<A>) => Iterable<A> {
  return (fa) => take_(fa, n);
}
