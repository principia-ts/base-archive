import type { Decoder } from './Decoder'
import type { Encoder } from './Encoder'

export interface Codec<I, E, A, O> extends Decoder<I, E, A>, Encoder<A, O> {}