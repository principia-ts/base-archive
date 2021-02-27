/* eslint-disable functional/immutable-data */
import type * as R from 'fp-ts/lib/ReadonlyRecord'

import * as A from 'fp-ts/lib/Array'
import * as E from 'fp-ts/lib/Either'
import * as F from 'fp-ts/lib/function'
import * as M from 'fp-ts/lib/Monoid'
import * as O from 'fp-ts/lib/Option'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import fs from 'fs'
import module from 'module'
import path from 'path'
import * as ts from 'typescript'

/*
 * TODO: I will clean this up
 */

export default function fixESM(
  _: ts.Program,
  config?: {
    relativeProjectRoot?: string
    prefix?: string
    specifierExtension?: boolean
    ignoreExtensions?: Array<string>
    createRequire?: boolean
  }
): ts.TransformerFactory<ts.SourceFile> {
  return (ctx) => (sourceFile) => {
    const { visitedSourceFile, info } = config?.createRequire
      ? importExportVisitorFull(ctx, sourceFile, config)
      : importExportVisitorSpecifierOnly(ctx, sourceFile, config)

    const generatedTopNodes = ts.factory.createNodeArray([
      ...info.esmImports,
      ...(info.shouldCreateRequire
        ? [createRequireImport(config?.prefix), createRequireStatement(config?.prefix), ...info.requires]
        : []),
      ...info.destructureRequires
    ])

    const generatedBottomNodes = ts.factory.createNodeArray([...info.esmExports])

    const updatedStatements = ts.factory.createNodeArray([
      ...generatedTopNodes,
      ...visitedSourceFile.statements,
      ...generatedBottomNodes
    ])

    return ts.factory.updateSourceFile(visitedSourceFile, updatedStatements)
  }
}

const VisitorInfoM = M.getStructMonoid<VisitorInfo>({
  cjsExportStarIdentifiers: A.getMonoid(),
  destructureRequires: A.getMonoid(),
  esmExports: A.getMonoid(),
  esmImports: A.getMonoid(),
  exportStatements: A.getMonoid(),
  requires: A.getMonoid(),
  shouldCreateRequire: M.monoidAny
})

export const importExportVisitorSpecifierOnly = (
  ctx: ts.TransformationContext,
  sourceFile: ts.SourceFile,
  config?: {
    relativeProjectRoot?: string
    prefix?: string
    specifierExtension?: boolean
    ignoreExtensions?: Array<string>
    createRequire?: boolean
  }
): { info: VisitorInfo, visitedSourceFile: ts.SourceFile } => {
  const visitorInfo = { ...VisitorInfoM.empty }
  const visitor     = (info: VisitorInfo) => (node: ts.Node): ts.Node | undefined => {
    let newInfo = { ...VisitorInfoM.empty }
    if (isImportOrExport(node)) {
      const specifierText = node.moduleSpecifier.text
      if (isSpecifierRelative(node)) {
        if (isImport(node)) {
          newInfo = {
            ...VisitorInfoM.empty,
            esmImports: [
              ts.factory.createImportDeclaration(
                node.decorators,
                node.modifiers,
                node.importClause,
                createValidESMPath(node, sourceFile, config)
              )
            ]
          }
        } else if (isExport(node)) {
          newInfo = {
            ...VisitorInfoM.empty,
            esmExports: [
              ts.factory.createExportDeclaration(
                node.decorators,
                node.modifiers,
                false,
                node.exportClause,
                createValidESMPath(node, sourceFile, config)
              )
            ]
          }
        }
      } else if (module.builtinModules.includes(specifierText)) {
        if (isImport(node)) {
          newInfo = {
            ...VisitorInfoM.empty,
            esmImports: [node]
          }
        } else if (isExport(node)) {
          newInfo = {
            ...VisitorInfoM.empty,
            esmExports: [node]
          }
        }
      } else {
        const packageJSON = getPackageJSON(node, config?.relativeProjectRoot)
        if (packageJSON) {
          if (isImport(node)) {
            newInfo = {
              ...VisitorInfoM.empty,
              esmImports: [
                ts.factory.createImportDeclaration(
                  node.decorators,
                  node.modifiers,
                  node.importClause,
                  createValidESMPath(node, sourceFile, config, packageJSON)
                )
              ]
            }
          } else if (isExport(node)) {
            newInfo = {
              ...VisitorInfoM.empty,
              esmExports: [
                ts.factory.createExportDeclaration(
                  node.decorators,
                  node.modifiers,
                  false,
                  node.exportClause,
                  createValidESMPath(node, sourceFile, config, packageJSON)
                )
              ]
            }
          }
        }
      }

      info.esmExports = info.esmExports.concat(...newInfo.esmExports)
      info.esmImports = info.esmImports.concat(...newInfo.esmImports)
      return undefined
    } else {
      return ts.visitEachChild(node, visitor(info), ctx)
    }
  }
  const visitedSourceFile = ts.visitEachChild(sourceFile, visitor(visitorInfo), ctx)
  return {
    info: visitorInfo,
    visitedSourceFile
  }
}

export const importExportVisitorFull = (
  ctx: ts.TransformationContext,
  sourceFile: ts.SourceFile,
  config?: {
    relativeProjectRoot?: string
    prefix?: string
    specifierExtension?: boolean
  }
): { info: VisitorInfo, visitedSourceFile: ts.SourceFile } => {
  const visitorInfo = { ...VisitorInfoM.empty }
  const visitor     = (info: VisitorInfo) => (node: ts.Node): ts.Node | undefined => {
    let newInfo = { ...VisitorInfoM.empty }
    if (isImportOrExport(node)) {
      const specifierText = node.moduleSpecifier.text
      if (isSpecifierRelative(node)) {
        // Relative path, so only create a valud ESM specifier
        newInfo = isImport(node)
          ? {
              ...VisitorInfoM.empty,
              esmImports: [
                ts.factory.createImportDeclaration(
                  node.decorators,
                  node.modifiers,
                  node.importClause,
                  createValidESMPath(node, sourceFile, config)
                )
              ]
            }
          : isExport(node)
          ? {
              ...VisitorInfoM.empty,
              esmExports: [
                ts.factory.createExportDeclaration(
                  node.decorators,
                  node.modifiers,
                  false,
                  node.exportClause,
                  createValidESMPath(node, sourceFile, config)
                )
              ]
            }
          : VisitorInfoM.empty
      } else if (module.builtinModules.includes(specifierText)) {
        if (isImport(node)) {
          newInfo = {
            ...VisitorInfoM.empty,
            esmImports: [node]
          }
        } else if (isExport(node)) {
          newInfo = {
            ...VisitorInfoM.empty,
            esmExports: [node]
          }
        }
      } else {
        const packageJSON = getPackageJSON(node, config?.relativeProjectRoot)
        if (packageJSON) {
          if (isESModule(packageJSON) || isConditionalModule(packageJSON)) {
            // Imported or exported path is in an ESM package, so only create a valid ESM specifier
            newInfo = isImport(node)
              ? {
                  ...VisitorInfoM.empty,
                  esmImports: [
                    ts.factory.createImportDeclaration(
                      node.decorators,
                      node.modifiers,
                      node.importClause,
                      createValidESMPath(node, sourceFile, config, packageJSON)
                    )
                  ]
                }
              : isExport(node)
              ? {
                  ...VisitorInfoM.empty,
                  esmExports: [
                    ts.factory.createExportDeclaration(
                      node.decorators,
                      node.modifiers,
                      false,
                      node.exportClause,
                      createValidESMPath(node, sourceFile, config, packageJSON)
                    )
                  ]
                }
              : VisitorInfoM.empty
          } else {
            // commonjs, builtin, or no package
            if (isImport(node)) {
              if (isNamedImport(node) && isDefaultImport(node)) {
                // import A, { a, b } from "..."
                newInfo = {
                  ...VisitorInfoM.empty,
                  destructureRequires: [createDestructureStatementForImport(node)],
                  esmImports: [createDefaultImport(node, createValidESMPath(node, sourceFile, config, packageJSON))]
                }
              } else if (isNamedImport(node)) {
                // import { A } from "..."
                newInfo = {
                  ...VisitorInfoM.empty,
                  requires: [createRequireStatementForImport(node, config?.prefix)],
                  shouldCreateRequire: true
                }
              } else if (isNamespaceImport(node)) {
                // import * as A from "..."
                newInfo = {
                  ...VisitorInfoM.empty,
                  esmImports: [
                    createDefaultImportForNamespaceImport(
                      node,
                      createValidESMPath(node, sourceFile, config, packageJSON)
                    )
                  ]
                }
              } else if (isDefaultImport(node)) {
                // import A from "..."
                newInfo = {
                  ...VisitorInfoM.empty,
                  esmImports: [createDefaultImport(node, createValidESMPath(node, sourceFile, config, packageJSON))]
                }
              }
            } else if (isExport(node)) {
              if (isNamedExport(node)) {
                // export { a, b } from "..."
                newInfo = {
                  ...VisitorInfoM.empty,
                  esmExports: [createExportDeclarationForNamedRequires(node, config?.prefix)],
                  requires: [createRequireStatementForExport(node, config?.prefix)],
                  shouldCreateRequire: true
                }
              } else if (isNamespaceExport(node)) {
                // export * as A from "..."
                newInfo = {
                  ...VisitorInfoM.empty,
                  esmExports: [createNamedExportsForDefaultImport(node, config?.prefix)],
                  esmImports: [
                    createDefaultImportForNamespaceExport(
                      node,
                      createValidESMPath(node, sourceFile, config),
                      config?.prefix
                    )
                  ]
                }
              } else {
                // export * from "..."
                throw new Error(
                  `Cannot currently export * from 'cjs-module' @ ${sourceFile.fileName} : ${node.getText()}`
                )
              }
            }
          }
        }
      }
      info.shouldCreateRequire = info.shouldCreateRequire || newInfo.shouldCreateRequire
      info.esmExports          = info.esmExports.concat(...newInfo.esmExports)
      info.esmImports          = info.esmImports.concat(...newInfo.esmImports)
      info.requires            = info.requires.concat(...newInfo.requires)
      return undefined
    } else {
      return ts.visitEachChild(node, visitor(info), ctx)
    }
  }
  const visitedSourceFile = ts.visitEachChild(sourceFile, visitor(visitorInfo), ctx)
  return {
    info: visitorInfo,
    visitedSourceFile
  }
}

/*
 * -------------------------------------------
 * Utilities
 * -------------------------------------------
 */

type PackageJson = R.ReadonlyRecord<string, any>

export const readFile = (path: string): E.Either<null, Buffer> =>
  E.tryCatch(
    () => fs.readFileSync(path),
    () => null
  )

export const isDirectory = (path: string): boolean =>
  F.pipe(
    E.tryCatch(
      () => fs.lstatSync(path).isDirectory(),
      () => null
    ),
    E.fold(() => false, F.identity)
  )

export const recover = <E, A>(f: (e: E) => E.Either<E, A>) => (ma: E.Either<E, A>) =>
  F.pipe(
    ma,
    E.fold(f, () => ma)
  )

export const deepHasProperty = (obj: R.ReadonlyRecord<string, any>, key: string): boolean => {
  let hasKey = false
  for (const k in obj) {
    if (k === key) {
      hasKey = true
    } else if (typeof obj[k] == 'object' && !Array.isArray(obj[k])) {
      hasKey = deepHasProperty(obj[k] as Record<string, unknown>, key)
    }
    if (hasKey) {
      break
    }
  }
  return hasKey
}

export const isImportOrExport = (node: ts.Node): node is ImportOrExport =>
  (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
  !!node.moduleSpecifier &&
  ts.isStringLiteral(node.moduleSpecifier)

export const isImport = (node: ts.Node): node is Import =>
  ts.isImportDeclaration(node) &&
  !!node.moduleSpecifier &&
  ts.isStringLiteral(node.moduleSpecifier) &&
  !!node.importClause

export const isNamedImport = (node: Import): node is NamedImport =>
  !!node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)

export const isDefaultImport = (node: Import): node is DefaultImport => !!node.importClause.name

export const isNamespaceImport = (node: Import): node is NamespaceImport =>
  !!node.importClause.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)

export const isSpecifierRelative = (node: ImportOrExport) => {
  const specifierText = node.moduleSpecifier.text
  return specifierText.startsWith('./') || specifierText.startsWith('../') || specifierText.startsWith('..')
}

export const isExport = (node: ts.Node): node is Export =>
  ts.isExportDeclaration(node) && !!node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)

export const isNamespaceExport = (node: Export): node is NamespaceExport =>
  !!node.exportClause && ts.isNamespaceExport(node.exportClause)

export const isNamedExport = (node: Export): node is NamedExport =>
  !!node.exportClause && ts.isNamedExports(node.exportClause)

export const isESModule = (packageJSON: PackageJson) => packageJSON.type === 'module'

export const isConditionalModule = (packageJSON: PackageJson) =>
  packageJSON.exports && deepHasProperty(packageJSON.exports, 'import')

export const isOldESModule = (packageJSON: PackageJson) => packageJSON.module

export const findPackageJSON = (prospectivePath: string): Buffer | null => {
  const folderPath = (prospectivePath.split('/') as unknown) as NEA.ReadonlyNonEmptyArray<string>
  if (NEA.last(folderPath) === 'node_modules') {
    return null
  } else {
    const newPath = [...folderPath, 'package.json'].join('/')
    try {
      return fs.readFileSync(newPath)
    } catch {
      return findPackageJSON(NEA.init(folderPath).join('/'))
    }
  }
}

export const getPackageJSON = (node: ImportOrExport, relativeProjectRoot?: string) => {
  const prospectivePath = path.resolve(relativeProjectRoot ?? process.cwd(), 'node_modules', node.moduleSpecifier.text)
  const maybeBuffer     = findPackageJSON(prospectivePath)
  if (maybeBuffer) {
    try {
      return JSON.parse(maybeBuffer.toString()) as PackageJson
    } catch {
      return null
    }
  } else {
    return null
  }
  /*
   * return F.pipe(
   *    findPackageJSON(prospectivePath),
   *    E.chain((buf) =>
   *       F.pipe(
   *          E.parseJSON(buf.toString(), () => null),
   *          E.map((json) => json as PackageJson)
   *       )
   *    )
   * );
   */
}

export const isSpecifierExtensionEmpty = (node: ImportOrExport) => path.extname(node.moduleSpecifier.text) === ''

export const isSpecifierExtensionUnknown = (node: ImportOrExport, ignoredExtensions?: ReadonlyArray<string>) => {
  const extension = path.extname(node.moduleSpecifier.text)
  if (ignoredExtensions?.includes(extension)) return false
  return true
}

export const foldNullable = <A, B>(onNone: () => B, onSome: (a: A) => B) => (v?: A) =>
  F.pipe(O.fromNullable(v), O.fold(onNone, onSome))

export const getAbsolutePathForSpecifier = (
  node: ImportOrExport,
  sourceFile: ts.SourceFile,
  config?: PluginConfig,
  packageJSON?: PackageJson
) => {
  const specifierText = node.moduleSpecifier.text
  if (isSpecifierRelative(node)) {
    return path.resolve(path.parse(sourceFile.fileName).dir, specifierText === '..' ? '../' : specifierText)
  } else {
    if (packageJSON && packageJSON.name && specifierText.includes(packageJSON.name)) {
      const p     = packageJSON
      const parts = F.pipe(
        O.fromNullable<string>(p.exports?.import?.['./*'] ?? p.exports?.['./*']?.import ?? p.main ?? null),
        O.map((s) => s.replace('./', '').split('/').slice(0, -1).join('/')),
        O.map((mainPath): string[] => [
          p.name,
          mainPath,
          ...specifierText.replace(p.name, '').replace(`/${mainPath}/`, '').split('/')
        ]),
        O.fold(() => [specifierText], F.identity)
      )
      return path.resolve(config?.relativeProjectRoot ?? process.cwd(), 'node_modules', ...parts)
    } else {
      return path.resolve(config?.relativeProjectRoot ?? process.cwd(), 'node_modules', specifierText)
    }
  }
}
/*
 * F.pipe(
 *    node,
 *    O.fromPredicate(F.not(isSpecifierRelative)),
 *    O.chain((n) =>
 *       F.pipe(
 *          O.some({}),
 *          O.bind("specifierText", () => O.some(n.moduleSpecifier.text)),
 *          O.bind("pkg", () => O.fromNullable(packageJSON)),
 *          O.bind("absolutePath", ({ pkg, specifierText }) =>
 *             F.pipe(
 *                pkg,
 *                O.fromPredicate((p) => !!p.name),
 *                O.chain(O.fromPredicate((p) => specifierText.includes(p.name))),
 *                O.chain(
 *                   (p): O.Option<string> =>
 *                      p.main
 *                         ? O.some(p.main)
 *                         : p.exports
 *                         ? p.exports.import?.["./*"]
 *                            ? O.some(p.exports.import["./*"])
 *                            : p.exports["./*"]?.import
 *                            ? O.some(p.exports["./*"].import)
 *                            : O.none
 *                         : O.none
 *                ),
 *                O.map((s) => s.replace("./", "").split("/").slice(0, -1).join("/")),
 *                O.map((mainPath): string[] => [
 *                   pkg.name,
 *                   mainPath,
 *                   ...specifierText.replace(pkg.name, "").replace(`/${mainPath}/`, "").split("/")
 *                ]),
 *                O.fold(() => [specifierText], F.identity),
 *                (parts) =>
 *                   O.some(
 *                      path.resolve(
 *                         config?.relativeProjectRoot ?? process.cwd(),
 *                         "node_modules",
 *                         ...parts
 *                      )
 *                   )
 *             )
 *          )
 *       )
 *    ),
 *    O.fold(
 *       () =>
 *          path.resolve(
 *             path.parse(sourceFile.fileName).dir,
 *             node.moduleSpecifier.text === ".." ? "../" : node.moduleSpecifier.text
 *          ),
 *       ({ absolutePath }) => absolutePath
 *    )
 * );
 */

export const createValidESMPath = (
  node: ImportOrExport,
  sourceFile: ts.SourceFile,
  config?: {
    relativeProjectRoot?: string
    prefix?: string
    specifierExtension?: boolean
    ignoreExtensions?: Array<string>
  },
  packageJSON?: PackageJson
): ts.StringLiteral => {
  if (config?.specifierExtension === false) {
    return node.moduleSpecifier
  }
  if (
    packageJSON &&
    node.moduleSpecifier.text === packageJSON.name &&
    (packageJSON.main || (packageJSON.exports && deepHasProperty(packageJSON.exports, '.')))
  ) {
    return node.moduleSpecifier
  }
  if (isSpecifierExtensionEmpty(node) || config?.ignoreExtensions?.includes(path.extname(node.moduleSpecifier.text))) {
    console.log(path.extname(node.moduleSpecifier.text))
    const absolutePath = getAbsolutePathForSpecifier(node, sourceFile, config, packageJSON)
    return ts.factory.createStringLiteral(
      isDirectory(absolutePath) ? `${node.moduleSpecifier.text}/index.js` : `${node.moduleSpecifier.text}.js`
    )
  }
  return node.moduleSpecifier
}

/**
 * Used when import declaration renames import
 */
export const createDestructureStatementForImport = (
  node: ts.ImportDeclaration & {
    importClause: {
      name?: ts.Identifier
      namedBindings: ts.NamedImports
      propertyName?: ts.Identifier
    }
    moduleSpecifier: ts.StringLiteral
  }
) => {
  const bindings        = node.importClause.namedBindings
  const requireElements = bindings.elements.map((specifier) => {
    return ts.factory.createBindingElement(undefined, specifier.propertyName, specifier.name)
  })
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          ts.factory.createObjectBindingPattern(requireElements),
          undefined,
          undefined,
          node.importClause.name
        )
      ],
      ts.NodeFlags.Const
    )
  )
}

export const createRequireStatementForImport = (node: NamedImport, prefix = '__') => {
  const bindings        = node.importClause.namedBindings
  const requireElements = bindings.elements.map((specifier) => {
    if (specifier.propertyName) {
      return ts.factory.createBindingElement(undefined, specifier.propertyName, specifier.name)
    }
    return ts.factory.createBindingElement(undefined, undefined, specifier.name)
  })
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          ts.factory.createObjectBindingPattern(requireElements),
          undefined,
          undefined,
          ts.factory.createCallExpression(ts.createIdentifier(prefix + 'require'), undefined, [
            ts.factory.createStringLiteral(node.moduleSpecifier.text)
          ])
        )
      ],
      ts.NodeFlags.Const
    )
  )
}

export const createRequireStatementForExport = (node: NamedExport, prefix = '__') => {
  const elements        = node.exportClause.elements
  const requireElements = elements.map((specifier) => {
    if (specifier.propertyName) {
      return ts.factory.createBindingElement(undefined, specifier.propertyName, prefix + specifier.name)
    }
    return ts.factory.createBindingElement(undefined, specifier.name, prefix + specifier.name)
  })
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          ts.factory.createObjectBindingPattern(requireElements),
          undefined,
          undefined,
          ts.factory.createCallExpression(ts.createIdentifier(prefix + 'require'), undefined, [
            ts.factory.createStringLiteral(node.moduleSpecifier.text)
          ])
        )
      ],
      ts.NodeFlags.Const
    )
  )
}

export const createExportDeclarationForNamedRequires = (node: NamedExport, prefix = '__') => {
  const elements = node.exportClause.elements.map((specifier) => {
    if (specifier.propertyName) {
      return ts.factory.createExportSpecifier(prefix + specifier.propertyName, specifier.name)
    }
    return ts.factory.createExportSpecifier(prefix + specifier.name, specifier.name)
  })
  return ts.factory.createExportDeclaration(
    node.decorators,
    node.modifiers,
    false,
    ts.factory.createNamedExports(elements)
  )
}

export const createRequireStatement = (prefix = '__') => {
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          prefix + 'require',
          undefined,
          undefined,
          ts.factory.createCallExpression(ts.factory.createStringLiteral(prefix + 'createRequire'), undefined, [
            ts.factory.createPropertyAccessExpression(
              ts.factory.createMetaProperty(ts.SyntaxKind.ImportKeyword, ts.factory.createIdentifier('meta')),
              'url'
            )
          ])
        )
      ],
      ts.NodeFlags.Const
    )
  )
}

export const createRequireImport = (prefix = '__') => {
  return ts.factory.createImportDeclaration(
    undefined,
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports([
        ts.factory.createImportSpecifier(
          ts.createIdentifier('createRequire'),
          ts.createIdentifier(prefix + 'createRequire')
        )
      ])
    ),
    ts.factory.createStringLiteral('module')
  )
}

export const createDefaultImportForNamespaceImport = (node: NamespaceImport, specifier: ts.StringLiteral) => {
  return ts.factory.createImportDeclaration(
    undefined,
    undefined,
    ts.factory.createImportClause(
      false,
      ts.factory.createIdentifier(node.importClause.namedBindings.name.text),
      undefined
    ),
    specifier
  )
}

export const createDefaultImportForNamespaceExport = (
  node: NamespaceExport,
  specifier: ts.StringLiteral,
  prefix = '__'
) =>
  ts.factory.createImportDeclaration(
    undefined,
    undefined,
    ts.factory.createImportClause(false, ts.factory.createIdentifier(prefix + node.exportClause.name.text), undefined),
    specifier
  )

export const createDefaultImport = (node: DefaultImport, specifier: ts.StringLiteral) => {
  return ts.factory.createImportDeclaration(
    undefined,
    undefined,
    ts.factory.createImportClause(false, ts.createIdentifier(node.importClause.name.text), undefined),
    specifier
  )
}

export const createNamedExportsForDefaultImport = (node: NamespaceExport, prefix = '__') =>
  ts.factory.createExportDeclaration(
    node.decorators,
    node.modifiers,
    false,
    ts.factory.createNamedExports([
      ts.factory.createExportSpecifier(prefix + node.exportClause.name, node.exportClause.name)
    ])
  )

export const createDefaultImportForDefaultExport = (specifier: ts.StringLiteral, prefix = '__') => {
  const identifier  = ts.factory.createIdentifier(
    prefix +
      specifier.text
        .split('/')
        .map((v) => (v.includes(path.extname(specifier.text)) ? v.replace(path.extname(specifier.text), '') : v))
        .map((v) => v.replace('-', '_'))
        .join('_')
  )
  const declaration = ts.factory.createImportDeclaration(
    undefined,
    undefined,
    ts.factory.createImportClause(false, identifier, undefined),
    specifier
  )
  return {
    declaration,
    identifier
  }
}

/*
 * -------------------------------------------
 * Types
 * -------------------------------------------
 */

export type ImportOrExport = (ts.ImportDeclaration | ts.ExportDeclaration) & {
  moduleSpecifier: ts.StringLiteral
}

export type Import = ts.ImportDeclaration & {
  importClause: ts.ImportClause
  moduleSpecifier: ts.StringLiteral
}

export type NamedImport = Import & {
  importClause: ts.ImportClause & {
    namedBindings: ts.NamedImports
  }
}

export type DefaultImport = Import & {
  importClause: ts.ImportClause & {
    name: ts.Identifier
  }
}

export type NamespaceImport = Import & {
  importClause: ts.ImportClause & {
    namedBindings: ts.NamespaceImport
  }
}

export type Export = ts.ExportDeclaration & {
  moduleSpecifier: ts.StringLiteral
}

export type NamespaceExport = Export & {
  exportClause: ts.NamespaceExport & {
    name: ts.Identifier
  }
}

export type NamedExport = Export & {
  exportClause: ts.NamedExports & {
    elements: ts.NodeArray<ts.ExportSpecifier>
  }
}

export type PluginConfig = {
  createRequire?: boolean
  extension?: string
  ignore?: ReadonlyArray<string>
  prefix?: string
  relativeProjectRoot?: string
}

export type VisitorInfo = {
  cjsExportStarIdentifiers: ts.Identifier[]
  destructureRequires: ts.VariableStatement[]
  esmExports: ts.ExportDeclaration[]
  esmImports: ts.ImportDeclaration[]
  exportStatements: ts.VariableStatement[]
  requires: ts.VariableStatement[]
  shouldCreateRequire: boolean
}
