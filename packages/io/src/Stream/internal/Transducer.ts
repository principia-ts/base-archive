// Contract notes for transducers:
// - When a None is received, the transducer must flush all of its internal state
//   and remain empty until subsequent Some(Chunk) values.
//
//   Stated differently, after a first push(None), all subsequent push(None) must

import { Option } from "@principia/base/data/Option";
import { Chunk } from "../../Chunk";
import { IO } from "../../IO";
import { Managed } from "../../Managed";

//   result in empty [].
export class Transducer<R, E, I, O> {
  constructor(readonly push: Managed<R, never, (c: Option<Chunk<I>>) => IO<R, E, Chunk<O>>>) {}
}
