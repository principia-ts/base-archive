import * as tracing_1 from "@principia/compile/util";
const fileName_1 = "src-cjs/util.ts";
import * as I from '@principia/io/IO';
import glob_ from 'glob';
export function glob(glob, opts = {}) {
    return I.effectAsync(tracing_1.traceFrom(fileName_1 + ":6:24", (k) => {
        glob_(glob, opts, (err, result) => (err == null ? k(I.succeed(result)) : k(tracing_1.traceCall(I.fail, fileName_1 + ":7:86")(err))));
    }));
}
//# sourceMappingURL=util.js.map