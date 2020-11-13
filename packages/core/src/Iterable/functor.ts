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

export function mapWithIndex_<A, B>(fa: Iterable<A>, f: (i: number, a: A) => B): Iterable<B> {
   return {
      [Symbol.iterator]: () => genMap(fa[Symbol.iterator](), f)
   };
}

export function mapWithIndex<A, B>(f: (i: number, a: A) => B): (fa: Iterable<A>) => Iterable<B> {
   return (fa) => ({
      [Symbol.iterator]: () => genMap(fa[Symbol.iterator](), f)
   });
}

export function map_<A, B>(fa: Iterable<A>, f: (a: A) => B): Iterable<B> {
   return mapWithIndex_(fa, (_, a) => f(a));
}

export function map<A, B>(f: (a: A) => B): (fa: Iterable<A>) => Iterable<B> {
   return (fa) => map_(fa, f);
}
