import { ConfigurableErrorCode } from "../../api/managers/configurable";
import { EditorErrorCode } from "../../api/managers/editor-collection/editor";
import { CodeEditorErrorCode } from "../../api/managers/editor-collection/editors/code-editor";
import { ProjectErrorCode } from "../../api/managers/project";
import { ResourceErrorCode } from "../../api/managers/resource";
import { R } from "../../api/utils/result";
import { ProjectFlags } from "../../commands-utils/project";
import BaseCommand from "../../utils/base-command";

export default class ProjectOpenCodeEditorCommand extends BaseCommand<
  typeof ProjectOpenCodeEditorCommand
> {
  static summary = "Open the project in the code editor";
  static description = `\
Open the root directory in the code editor.

If no code editor is set, this command will fail.

To configure and code-editor, check \`bazaar editor code-editor set --help\`.`;

  static examples = [
    "bazaar project open-code-editor",
    "bazaar project open-code-editor --path=C:\\Users\\me\\Documents\\MyProject",
  ];

  static flags = {
    ...ProjectFlags,
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ProjectOpenCodeEditorCommand);

    this.Info.start(`Opening project in code editor`);
    const project = this.api.project(flags.path);
    const result = await project.openCodeEditor();

    if (R.isOk(result)) {
      this.Info.success();
      return;
    }

    if (result.code === ResourceErrorCode.DirectoryNotFound) {
      this.Info.failure();
      this.Warning.log(`The project "${flags.path}" does not exist`);
      return;
    }

    if (result.code === ConfigurableErrorCode.ConfigNotFound) {
      this.Info.failure();
      const message = `The project "${flags.path}" is not valid, no config was found`;
      this.Warning.log(message);
      return;
    }

    if (result.code === ConfigurableErrorCode.ConfigNotValid) {
      this.Info.failure();
      const message = `The project "${flags.path}" is not valid, the config is not valid`;
      this.Warning.log(message);
      return;
    }

    if (result.code === ProjectErrorCode.BaseromNotFound) {
      this.Info.failure();
      const message = `The project "${flags.path}" is not valid, no baserom was found`;
      this.Warning.log(message);
      return;
    }

    if (result.code === ProjectErrorCode.BaseromNotValid) {
      this.Info.failure();
      const message = `The project "${flags.path}" is not valid, the baserom is not valid`;
      this.Warning.log(message);
      return;
    }

    if (result.code === CodeEditorErrorCode.PathNotFound) {
      this.Info.failure();
      const message = `The path "${flags.path}" does not exist, choose a valid project path`;
      this.Warning.log(message);
      return;
    }

    if (result.code === EditorErrorCode.ExeNotSet) {
      this.Info.failure();
      const message = `The code editor is not configured
Check \`bazaar editor set code-editor --help\` for more`;
      this.Warning.log(message);
      return;
    }

    if (result.code === EditorErrorCode.ExeNotFound) {
      this.Info.failure();
      const message = `The configured code editor does not exist
Configure a new one \`bazaar editor set code-editor --help\` for more`;
      this.Warning.log(message);
      return;
    }

    if (result.code === EditorErrorCode.ExeNotValid) {
      this.Info.failure();
      const message = `The configured code editor is not a valid executable
Configure a new one \`bazaar editor set code-editor --help\` for more`;
      this.Warning.log(message);
      return;
    }

    this.Info.failure();
    const messages = R.messages(result, { verbose: true });
    this.Error(`Failed to open project in code editor\n${messages}`, 1);
  }
}
