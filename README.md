# principia - TypeScript Functional Programming Principles

`principia` represents my ongoing efforts in learning the principles behind category theory and functional programming, as well as creating a correct and structured implementation of those principles. However, I also aim for it to be a functional functional library (🙂) with high performance and powerful data types.

There are no tests written for this code as of yet. Use at your own risk!

## Included Works and Forks

Many portions of this software are forked from other projects. Essentially, this is an amalgamation of others' works along with my own contributions, which may include, but are not limited to, modifications to behavior, structure, or documentation. I wanted to use the concept provided by other packages, but maintain the code myself, to learn a useful skill and add features at my own leisure.

Assume that everything marked as _derived_ or _forked_ from somewhere is in some way altered by me. Please don't report any issues you may encounter to the original author(s), as it may very well be my fault!

Throughout the source code of this package, marked sections or `CREDITS` text files will provide links to code from which that section is forked. These are included to be a sort of bibliography.

## Awesome People

Throughout my journey of learning and applying functional programming, several individuals have been instrumental in my development.

[Giulio Canti](https://github.com/gcanti) - author of `fp-ts`, `fp-ts-contrib`, `newtype-ts`, `monocle-ts`, `io-ts`, and other packages - is a forefather of the TypeScript functional programming community. Many of the modules in this project are descendants of his work.

[Michael Arnaldi](https://github.com/Matechs-Garage) is the author of `effect-ts`, a TypeScript port of the `ZIO` library of Scala fame. He also implemented the encoding for Higher-Kinded Types that is used liberally in this package. The contents of `packages/io` is forked from `effect-ts`.
