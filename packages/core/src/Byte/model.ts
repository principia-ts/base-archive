import * as NT from "@principia/prelude/Newtype";

export const Byte = NT.typeDef<number>()("Byte");
export interface Byte extends NT.TypeOf<typeof Byte> {}
