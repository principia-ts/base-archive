import type ts from "typescript";

import dataFirst from "./dataFirst";
import identity from "./identity";
import unflow from "./unflow";
import unpipe from "./unpipe";

export default function bundle(
  _program: ts.Program,
  _opts?: {
    pipe?: boolean;
    flow?: boolean;
    identity?: boolean;
    dataFirst?: boolean;
  }
) {
  const B0 = {
    dataFirst: dataFirst(_program, _opts),
    identity: identity(_program, _opts),
    unflow: unflow(_program, _opts),
    unpipe: unpipe(_program, _opts)
  };

  return {
    before(ctx: ts.TransformationContext) {
      const B1 = {
        dataFirst: B0.dataFirst.before(ctx),
        identity: B0.identity.before(ctx),
        unflow: B0.unflow.before(ctx),
        unpipe: B0.unpipe.before(ctx)
      };

      return (sourceFile: ts.SourceFile) => {
        const unpiped = B1.unpipe(sourceFile);
        const unflowed = B1.unflow(unpiped);
        const unid = B1.identity(unflowed);
        const df = B1.dataFirst(unid);

        return df;
      };
    }
  };
}
