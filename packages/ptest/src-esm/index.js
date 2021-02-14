import * as tracing_1 from "@principia/compile/util.js";
import * as A from "@principia/base/Array.js";
import { pipe } from "@principia/base/Function/index.js";
import * as O from "@principia/base/Option.js";
import * as I from "@principia/io/IO/index.js";
import { isRunnableSpec } from "@principia/test/RunnableSpec.js";
import { TestArgs } from "@principia/test/TestArgs.js";
import { createRequire } from 'module';
import path from 'path';
import yargs from 'yargs';
import { glob } from "./util.js";
const fileName_1 = "src-esm/index.ts";
const _require = createRequire(import.meta.url);
_require('ts-node').register();
const argv = yargs(process.argv.slice(2))
    .options({
    path: { string: true },
    tests: { alias: 't', array: true, string: true },
    tags: { array: true, string: true },
    policy: { string: true }
})
    .help().argv;
const testArgs = new TestArgs(argv.tests || [], argv.tags || [], O.fromNullable(argv.policy));
const program = I.bind_(I.bind_(I.map_(glob(argv.path ?? './**/test/*Spec.ts'), A.map((s) => {
    const parsed = path.parse(s);
    return `${process.cwd()}/${parsed.dir}/${parsed.name}`;
})), tracing_1.traceFrom(fileName_1 + ":36:10", I.foreach((path) => I.effect(tracing_1.traceFrom(fileName_1 + ":36:39", () => _require(path).default))))), tracing_1.traceFrom(fileName_1 + ":37:10", I.foreach((test) => (isRunnableSpec(test) ? I.effectTotal(tracing_1.traceFrom(fileName_1 + ":37:68", () => test.main(testArgs))) : I.unit()))));
I.run_(program);
//# sourceMappingURL=index.js.map