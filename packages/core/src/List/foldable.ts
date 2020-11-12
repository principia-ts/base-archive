/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { FoldlWhileState } from "./_internal";
import {
   foldlCb,
   foldlNode,
   foldlPrefix,
   foldlSuffix,
   foldlWhileCb,
   foldrNode,
   foldrPrefix,
   foldrSuffix,
   getDepth,
   getPrefixSize,
   getSuffixSize
} from "./_internal";
import type { List } from "./model";

/*
 * -------------------------------------------
 * Foldable List
 * -------------------------------------------
 */

/**
 * Folds a function over a list. Left-associative.
 */
export function reduce_<A, B>(fa: List<A>, initial: B, f: (acc: B, a: A) => B): B {
   const suffixSize = getSuffixSize(fa);
   const prefixSize = getPrefixSize(fa);
   let acc = initial;
   acc = foldlPrefix(f, acc, fa.prefix, prefixSize);
   if (fa.root !== undefined) {
      acc = foldlNode(f, acc, fa.root, getDepth(fa));
   }
   return foldlSuffix(f, acc, fa.suffix, suffixSize);
}

/**
 * Folds a function over a list. Left-associative.
 */
export function reduce<A, B>(initial: B, f: (acc: B, value: A) => B): (fa: List<A>) => B {
   return (l) => reduce_(l, initial, f);
}

/**
 * Folds a function over a list. Right-associative.
 *
 * @complexity O(n)
 */
export function reduceRight_<A, B>(fa: List<A>, initial: B, f: (value: A, acc: B) => B): B {
   const suffixSize = getSuffixSize(fa);
   const prefixSize = getPrefixSize(fa);
   let acc = foldrSuffix(f, initial, fa.suffix, suffixSize);
   if (fa.root !== undefined) {
      acc = foldrNode(f, acc, fa.root, getDepth(fa));
   }
   return foldrPrefix(f, acc, fa.prefix, prefixSize);
}

/**
 * Folds a function over a list. Right-associative.
 *
 * @complexity O(n)
 */
export function reduceRight<A, B>(initial: B, f: (value: A, acc: B) => B): (l: List<A>) => B {
   return (l) => reduceRight_(l, initial, f);
}

export function reduceWhile_<A, B>(
   l: List<A>,
   initial: B,
   predicate: (acc: B, value: A) => boolean,
   f: (acc: B, value: A) => B
): B {
   return foldlCb<A, FoldlWhileState<A, B>>(foldlWhileCb, { predicate, f, result: initial }, l).result;
}

export function reduceWhile<A, B>(
   initial: B,
   predicate: (acc: B, value: A) => boolean,
   f: (acc: B, value: A) => B
): (l: List<A>) => B {
   return (l) => reduceWhile_(l, initial, predicate, f);
}
