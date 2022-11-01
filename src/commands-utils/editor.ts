import EditorCollection from "../api/managers/editor-collection";
import Editor from "../api/managers/editor-collection/editor";

export enum EditorName {
  CodeEditor = "code-editor",
  Emulator = "emulator",
}

export const getEditor = (
  toolCollection: EditorCollection,
  toolName: EditorName,
): Editor => {
  switch (toolName) {
    case EditorName.CodeEditor:
      return toolCollection.CodeEditor;
    case EditorName.Emulator:
      return toolCollection.Emulator;
  }
};
