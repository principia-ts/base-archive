import * as tracing_1 from "@principia/compile/util";
const fileName_1 = "src-cjs/index.ts";
import * as A from '@principia/base/Array';
import { pipe } from '@principia/base/Function';
import * as O from '@principia/base/Option';
import * as I from '@principia/io/IO';
import { isRunnableSpec } from '@principia/test/RunnableSpec';
import { TestArgs } from '@principia/test/TestArgs';
import path from 'path';
import yargs from 'yargs';
import { glob } from './util';
require('ts-node').register();
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
})), tracing_1.traceFrom(fileName_1 + ":34:10", I.foreach((path) => I.effect(tracing_1.traceFrom(fileName_1 + ":34:39", () => require(path).default))))), tracing_1.traceFrom(fileName_1 + ":35:10", I.foreach((test) => (isRunnableSpec(test) ? I.effectTotal(tracing_1.traceFrom(fileName_1 + ":35:68", () => test.main(testArgs))) : I.unit()))));
I.run_(program);
//# sourceMappingURL=index.js.map