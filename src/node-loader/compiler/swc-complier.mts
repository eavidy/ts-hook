import {
    transform as swcTransform,
    transformSync as swcTransformSync,
    Options as SwcOptions,
    ReactConfig,
    Config,
    JscTarget,
} from "@swc/core";
import type ts from "typescript";
import { ModuleKind, ScriptTarget } from "../util/tslib.mjs";

const DEFAULT_ES_TARGET: JscTarget = "esnext";

export interface Options {
    target?: JscTarget;
    module?: "commonjs" | "umd" | "amd" | "es6";
    sourcemap?: Config["sourceMaps"];
    jsx?: boolean;
    experimentalDecorators?: boolean;
    emitDecoratorMetadata?: boolean;
    dynamicImport?: boolean;
    esModuleInterop?: boolean;
    keepClassNames?: boolean;
    react?: Partial<ReactConfig>;
    paths?: {
        [from: string]: [string];
    };
    swc?: SwcOptions;
}

function transformOption(path: string, options?: Options, jest = false): SwcOptions {
    const opts = options == null ? {} : options;
    opts.esModuleInterop = opts.esModuleInterop ?? true;
    return {
        filename: path,
        jsc: options?.swc?.swcrc
            ? undefined
            : {
                  target: opts.target ?? DEFAULT_ES_TARGET,
                  externalHelpers: jest ? true : false,
                  parser: {
                      syntax: "typescript" as const,
                      tsx: typeof opts.jsx !== "undefined" ? opts.jsx : path.endsWith(".tsx"),
                      decorators: Boolean(opts.experimentalDecorators),
                      dynamicImport: Boolean(opts.dynamicImport),
                  },
                  transform: {
                      legacyDecorator: Boolean(opts.experimentalDecorators),
                      decoratorMetadata: Boolean(opts.emitDecoratorMetadata),
                      react: options?.react,
                      // @ts-expect-error
                      hidden: {
                          jest,
                      },
                  },
                  keepClassNames: opts.keepClassNames,
                  paths: opts.paths,
              },
        minify: false,
        isModule: true,
        module: {
            type: options?.module ?? "commonjs",
            noInterop: !opts.esModuleInterop,
        },
        sourceMaps: jest || typeof opts.sourcemap === "undefined" ? "inline" : opts.sourcemap,
        inlineSourcesContent: true,
        swcrc: false,
        ...(options?.swc ?? {}),
    };
}

export function transformSync(source: string, path: string, options?: Options) {
    return swcTransformSync(source, transformOption(path, options));
}

export function transform(source: string, path: string, options?: Options) {
    return swcTransform(source, transformOption(path, options));
}

function TsConfigToSwcConfig(filename?: string, options: ts.CompilerOptions = {}): SwcOptions {
    const { target, module } = options;
    let swcTarget: JscTarget = (
        target === ScriptTarget.ESNext ? "esnext" : ScriptTarget[target as any].toLowerCase()
    ) as any;

    let swcModule: string = "es6";
    let ignoreDynamic: boolean | undefined;

    if (module === ModuleKind.NodeNext || module === ModuleKind.Node16) {
        swcModule = "commonjs";
        ignoreDynamic = true;
    } else if (module === ModuleKind.CommonJS) swcModule = "commonjs";

    const swcOptions: SwcOptions = {
        filename: filename,
        jsc: {
            target: swcTarget ?? DEFAULT_ES_TARGET,
            externalHelpers: false,
            parser: {
                syntax: "typescript" as const,
                tsx: false,
                decorators: options.experimentalDecorators,
                dynamicImport: true,
            },
            transform: {
                decoratorMetadata: options.emitDecoratorMetadata,
            },
            paths: options.paths,
            keepClassNames: true,
        },
        minify: false,
        isModule: true,
        module: {
            type: swcModule as any,
            noInterop: options.esModuleInterop,
            strictMode: options.strict,
            ignoreDynamic,
        },
        sourceMaps: options.inlineSourceMap ? "inline" : options.sourceMap,

        swcrc: false,
    };
    return swcOptions;
}
export function transformSyncUseTsConfig(source: string, options: ts.TranspileOptions) {
    let res = swcTransformSync(source, TsConfigToSwcConfig(options.fileName, options.compilerOptions));
    return { outputText: res.code, sourceMapText: res.map };
}
export async function transformUseTsConfig(source: string, options: ts.TranspileOptions) {
    const res = await swcTransform(source, TsConfigToSwcConfig(options.fileName, options.compilerOptions));
    return { outputText: res.code, sourceMapText: res.map };
}
