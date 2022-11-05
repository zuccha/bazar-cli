import { ConfigurableErrorCode } from "../../api/managers/configurable";
import { EditorErrorCode } from "../../api/managers/editor-collection/editor";
import { ProjectErrorCode } from "../../api/managers/project";
import { ResourceErrorCode } from "../../api/managers/resource";
import { R } from "../../api/utils/result";
import { ProjectFlags } from "../../commands-utils/project";
import BaseCommand from "../../utils/base-command";

export default class ProjectOpenEmulatorCommand extends BaseCommand<
  typeof ProjectOpenEmulatorCommand
> {
  static summary = "Run the ROM hack in the emulator";
  static description = `\
Run the ROM hack in the configured emulator.

If no emulator is set, this command will fail.

To configure and emulator, check \`bazaar editor emulator set --help\`.`;

  static examples = [
    "bazaar project open-emulator",
    "bazaar project open-emulator --path=C:\\Users\\me\\Documents\\MyProject",
  ];

  static flags = {
    ...ProjectFlags,
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ProjectOpenEmulatorCommand);

    this.Info.start(`Running ROM hack in emulator`);
    const project = this.api.project(flags.path);
    const result = await project.openEmulator();

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

    if (result.code === EditorErrorCode.ExeNotSet) {
      this.Info.failure();
      const message = `The emulator is not configured
Check \`bazaar editor set emulator --help\` for more`;
      this.Warning.log(message);
      return;
    }

    if (result.code === EditorErrorCode.ExeNotFound) {
      this.Info.failure();
      const message = `The configured emulator does not exist
Configure a new one \`bazaar editor set emulator --help\` for more`;
      this.Warning.log(message);
      return;
    }

    if (result.code === EditorErrorCode.ExeNotValid) {
      this.Info.failure();
      const message = `The configured emulator is not a valid executable
Configure a new one \`bazaar editor set emulator --help\` for more`;
      this.Warning.log(message);
      return;
    }

    this.Info.failure();
    const messages = R.messages(result, { verbose: true });
    this.Error(`Failed to run ROM hack in emulator\n${messages}`, 1);
  }
}
