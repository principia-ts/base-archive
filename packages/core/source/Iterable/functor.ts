function* genMap<A, B>(ia: Iterator<A>, f: (i: number, a: A) => B) {
   let n = -1;
   while (true) {
      const result = ia.next();
      if (result.done) {
         break;
      }
      n += 1;
      yield f(n, result.value);
   }
}

export const mapWithIndex_ = <A, B>(fa: Iterable<A>, f: (i: number, a: A) => B): Iterable<B> => ({
   [Symbol.iterator]: () => genMap(fa[Symbol.iterator](), f)
});

export const mapWithIndex = <A, B>(f: (i: number, a: A) => B) => (fa: Iterable<A>): Iterable<B> => ({
   [Symbol.iterator]: () => genMap(fa[Symbol.iterator](), f)
});

export const map_ = <A, B>(fa: Iterable<A>, f: (a: A) => B): Iterable<B> => mapWithIndex_(fa, (_, a) => f(a));

export const map = <A, B>(f: (a: A) => B) => (fa: Iterable<A>): Iterable<B> => map_(fa, f);
