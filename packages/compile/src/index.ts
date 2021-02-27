import type ts from 'typescript'

import dataFirst from './dataFirst'
import fixESM from './fixESM'
import identity from './identity'
import tracer from './tracing'
import unflow from './unflow'
import unpipe from './unpipe'

export default function bundle(
  _program: ts.Program,
  _opts?: {
    tracing?: boolean
    pipe?: boolean
    flow?: boolean
    identity?: boolean
    dataFirst?: boolean
    moduleMap?: Record<string, string>
    functionModule?: string
    relativeProjectRoot?: string
    prefix?: string
    specifierExtension?: boolean
    ignoreExtensions?: Array<string>
    fixESM?: boolean
  }
) {
  const B0 = {
    dataFirst: dataFirst(_program, _opts),
    identity: identity(_program, _opts),
    tracer: tracer(_program, _opts),
    unflow: unflow(_program, _opts),
    unpipe: unpipe(_program, _opts),
    fixESM: fixESM(_program, _opts)
  }

  return {
    before(ctx: ts.TransformationContext) {
      const B1 = {
        dataFirst: B0.dataFirst.before(ctx),
        identity: B0.identity.before(ctx),
        tracer: B0.tracer.before(ctx),
        unflow: B0.unflow.before(ctx),
        unpipe: B0.unpipe.before(ctx)
      }

      return (sourceFile: ts.SourceFile) => {
        const traced   = B1.tracer(sourceFile)
        const unpiped  = B1.unpipe(traced)
        const unflowed = B1.unflow(unpiped)
        const unid     = B1.identity(unflowed)
        const df       = B1.dataFirst(unid)

        return df
      }
    },
    after(ctx: ts.TransformationContext) {
      const B1 = {
        fixESM: B0.fixESM(ctx)
      }

      return (sourceFile: ts.SourceFile) => {
        if (_opts?.fixESM === false) {
          return sourceFile
        } else {
          const final = B1.fixESM(sourceFile)
          return final
        }
      }
    }
  }
}
