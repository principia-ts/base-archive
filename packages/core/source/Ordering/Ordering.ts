import type { TypeOf } from "../Newtype";
import { newtype, typeDef } from "../Newtype";

const Ordering_ = typeDef<"LT" | "EQ" | "GT">()("Ordering");

export interface Ordering extends TypeOf<typeof Ordering_> {}
export const Ordering = newtype<Ordering>()(Ordering_);

export const LT = Ordering.wrap("LT");
export const GT = Ordering.wrap("GT");
export const EQ = Ordering.wrap("EQ");
