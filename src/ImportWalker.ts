/* eslint-disable no-labels */
import * as fs from "fs";
import * as path from "path";

import { NonEmptyArray } from "./NonEmptyArray";
import * as Parser from "./Parser";
import { InputPath, SourceDirectory } from "./Types";

// NOTE: This module uses just `string` instead of `AbsolutePath` for performance!

export type WalkImportsResult =
  | {
      tag: "FileSystemError";
      error: Error & { code?: string };
    }
  | {
      tag: "Success";
      allRelatedElmFilePaths: Set<string>;
    };

export function walkImports(
  sourceDirectories: NonEmptyArray<SourceDirectory>,
  inputPath: InputPath
): WalkImportsResult {
  const allRelatedElmFilePaths = initialRelatedElmFilePaths(
    sourceDirectories,
    inputPath
  );
  const visitedModules = new Set<string>();

  try {
    walkImportsHelper(
      sourceDirectories,
      inputPath.theInputPath.absolutePath,
      allRelatedElmFilePaths,
      visitedModules
    );
  } catch (errorAny) {
    const error = errorAny as Error & { code?: string };
    return { tag: "FileSystemError", error };
  }

  return { tag: "Success", allRelatedElmFilePaths };
}

function walkImportsHelper(
  sourceDirectories: NonEmptyArray<SourceDirectory>,
  elmFilePath: string,
  allRelatedElmFilePaths: Set<string>,
  visitedModules: Set<string>
): void {
  // This is much faster than `try-catch` around `parse` and checking for ENOENT.
  if (!fs.existsSync(elmFilePath)) {
    return;
  }

  const importedModules = parse(elmFilePath);

  for (const importedModule of importedModules) {
    const relativePath = `${path.join(...importedModule)}.elm`;
    if (!visitedModules.has(relativePath)) {
      visitedModules.add(relativePath);
      for (const sourceDirectory of sourceDirectories) {
        const newElmFilePath = path.resolve(
          sourceDirectory.theSourceDirectory.absolutePath,
          relativePath
        );
        allRelatedElmFilePaths.add(newElmFilePath);
        walkImportsHelper(
          sourceDirectories,
          newElmFilePath,
          allRelatedElmFilePaths,
          visitedModules
        );
      }
    }
  }
}

function parse(elmFilePath: string): Array<Parser.ModuleName> {
  const readState = Parser.initialReadState();
  const handle = fs.openSync(elmFilePath, "r");
  const buffer = Buffer.alloc(2048);
  let bytesRead = 0;
  outer: while ((bytesRead = fs.readSync(handle, buffer)) > 0) {
    for (const char of buffer.slice(0, bytesRead)) {
      Parser.readChar(char, readState);
      if (Parser.isNonImport(readState)) {
        break outer;
      }
    }
  }
  fs.closeSync(handle);
  return Parser.finalize(readState);
}

function initialRelatedElmFilePaths(
  sourceDirectories: NonEmptyArray<SourceDirectory>,
  inputPath: InputPath
): Set<string> {
  const inputPathString = inputPath.theInputPath.absolutePath;

  return new Set([
    inputPath.theInputPath.absolutePath,
    ...sourceDirectories.flatMap((sourceDirectory) => {
      const prefix = `${sourceDirectory.theSourceDirectory.absolutePath}${path.sep}`;
      return inputPathString.startsWith(prefix)
        ? sourceDirectories.map((sourceDirectory2) =>
            path.resolve(
              sourceDirectory2.theSourceDirectory.absolutePath,
              inputPathString.slice(prefix.length)
            )
          )
        : [];
    }),
  ]);
}