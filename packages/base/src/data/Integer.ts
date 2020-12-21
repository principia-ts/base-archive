import * as NT from "../Newtype";

export const Integer = NT.typeDef<number>()("Integer");
export interface Integer extends NT.TypeOf<typeof Integer> {}
