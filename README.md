# prelude/base

WIP

## Contributions, Included Works, and Derivations

For giving credit in this project, I use the word _derive_ to mean:

-  to obtain, develop, or modify from a source or origin

Assume that everything marked as _derived from_ somewhere is in some way altered by me. Please don't report any issues you may encounter to the original author(s), as it may very well be my fault.

_Throughout the source code of this package, marked sections or_ `CREDITS` _text files will provide links to files from which that section is derived._

Portions of this software are included, adapted, ported, or otherwise derived from other projects. Essentially, this is an amalgamation of others' works along with my own contributions. My contributions may include, but are not limited to, modifications to behavior, structure, or documentation.

Throughout my journey of learning and applying functional programming, several individuals have been absolutely pivotal to my development.

Giulio Canti - author of `fp-ts`, `fp-ts-contrib`, `newtype-ts`, `monocle-ts`, `io-ts`, and other packages - has been instrumental to the TypeScript functional programming community. Many of the modules in this project are direct descendants of his work.

Michael Arnaldi (and the contributors to Matechs Garage) is the author of `matechs-effect`, a TypeScript port of the `ZIO` library of Scala fame. He also implemented the encoding for Higher-Kinded Types that is used liberally in this package. Many of the typeclasses included in this package are either copied directly or restructured from his work. In addition, the `Effect`, `Layer` and other related types and implementations provided by this package are derived directly from `matechs-effect`.
