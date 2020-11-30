import { descriptorWith, pure } from "../_core";

export function fiberId() {
  return descriptorWith((d) => pure(d.id));
}
