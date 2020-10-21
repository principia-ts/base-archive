import { checkDescriptor, pure } from "../core";

export const checkFiberId = () => checkDescriptor((d) => pure(d.id));
