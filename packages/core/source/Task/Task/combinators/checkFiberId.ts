import { checkDescriptor, pure } from "../_core";

export const checkFiberId = () => checkDescriptor((d) => pure(d.id));
