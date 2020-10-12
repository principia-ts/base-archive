# principia - TypeScript Functional Programming Principles

`principia` is an academic pursuit and represents my ongoing efforts in learning the principles behind category theory and functional programming, as well as creating a correct and structured implementation of those principles. However, it also aims to be a functional functional library (pun absolutely intended) with high performance and powerful data types.

There are no tests written for this code as of yet, so _caveat emptor_, use at your own risk.

## Contributions, Included Works, and Derivations

For giving credit in this project, I use the word _derive_ to mean:

-  to obtain, develop, or modify from a source or origin

Assume that everything marked as _derived from_ somewhere is in some way altered by me. Please don't report any issues you may encounter to the original author(s), as it may very well be my fault.

_Throughout the source code of this package, marked sections or_ `CREDITS` _text files will provide links to files from which that section is derived._

Portions of this software are included, adapted, ported, or otherwise derived from other projects. Essentially, this is an amalgamation of others' works along with my own contributions. My contributions may include, but are not limited to, modifications to behavior, structure, or documentation.

Throughout my journey of learning and applying functional programming, several individuals have been absolutely pivotal to my development.

Giulio Canti - author of `fp-ts`, `fp-ts-contrib`, `newtype-ts`, `monocle-ts`, `io-ts`, and other packages - has been instrumental to the TypeScript functional programming community. Many of the modules in this project are direct descendants of his work.

Michael Arnaldi (and the contributors to Matechs Garage) is the author of `effect-ts`, a TypeScript port of the `ZIO` library of Scala fame. He also implemented the encoding for Higher-Kinded Types that is used liberally in this package. The contents of `effect` is forked from the `effect-ts` library as well.
