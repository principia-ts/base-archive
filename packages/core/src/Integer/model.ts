import * as NT from "@principia/prelude/Newtype";

export const Integer = NT.typeDef<number>()("Integer");
export interface Integer extends NT.TypeOf<typeof Integer> {}
