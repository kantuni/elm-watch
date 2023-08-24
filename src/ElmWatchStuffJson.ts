import * as Codec from "./Codec";
import { NonEmptyArray } from "./NonEmptyArray";
import { readJsonFile } from "./PathHelpers";
import { Port } from "./Port";
import {
  BrowserUiPosition,
  CompilationMode,
  ElmWatchStuffJsonPath,
} from "./Types";

// elm-stuff/elm-watch/stuff.json stores things between runs.
// Configuration is stored in elm-watch.json.
// There’s likely an elm-stuff/ folder next to elm-watch.json (but all
// elm.json could be at other levels and as such all elm-stuff folders too).
// Either way, it’s a good bet and people probably have `elm-stuff` in their
// .gitignore anyway.

export type Target = Codec.Infer<typeof Target>;
const Target = Codec.fields({
  compilationMode: Codec.optional(CompilationMode),
  browserUiPosition: Codec.optional(BrowserUiPosition),
  openErrorOverlay: Codec.optional(Codec.boolean),
});

export type ElmWatchStuffJson = Codec.Infer<typeof ElmWatchStuffJson>;
export const ElmWatchStuffJson = Codec.fields({
  port: Port,
  targets: Codec.record(Target),
});

type ParseResult =
  | ParseError
  | {
      tag: "NoElmWatchStuffJson";
      elmWatchStuffJsonPath: ElmWatchStuffJsonPath;
    }
  | {
      tag: "Parsed";
      elmWatchStuffJsonPath: ElmWatchStuffJsonPath;
      elmWatchStuffJson: ElmWatchStuffJson;
    };

type ParseError =
  | {
      tag: "ElmWatchStuffJsonDecodeError";
      errors: NonEmptyArray<Codec.DecoderError>;
    }
  | {
      tag: "ElmWatchStuffJsonReadError";
      errors: Error;
    };

export function readAndParse(
  elmWatchStuffJsonPath: ElmWatchStuffJsonPath
): ParseResult {
  const parsed = readJsonFile(
    elmWatchStuffJsonPath.theElmWatchStuffJsonPath,
    ElmWatchStuffJson
  );
  switch (parsed.tag) {
    case "DecodeError":
      return {
        tag: "ElmWatchStuffJsonDecodeError",
        errors: parsed.errors,
      };
    case "ReadError":
      return parsed.error.code === "ENOENT"
        ? {
            tag: "NoElmWatchStuffJson",
            elmWatchStuffJsonPath,
          }
        : {
            tag: "ElmWatchStuffJsonReadError",
            errors: parsed.error,
          };
    case "Success":
      return {
        tag: "Parsed",
        elmWatchStuffJsonPath,
        elmWatchStuffJson: parsed.value,
      };
  }
}
