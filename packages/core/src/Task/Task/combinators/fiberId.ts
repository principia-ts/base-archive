import { descriptorWith, pure } from "../_core";

export const fiberId = () => descriptorWith((d) => pure(d.id));
