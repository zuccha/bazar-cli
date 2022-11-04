import Project from "../../../api/managers/project";
import { R } from "../../../api/utils/result";
import {
  ProjectConfigFlags,
  ProjectTemplateFlags,
} from "../../../commands-utils/project";
import BaseCommand from "../../../utils/base-command";

export default class TemplateProjectUpdateMetadataCommand extends BaseCommand<
  typeof TemplateProjectUpdateMetadataCommand
> {
  static summary = "Update metadata of a project template";
  static description = "Metadata include the list of authors and the version.";

  static examples = [
    "template bazaar project update-metadata --name=RHR --author=john",
    "bazaar template project update-metadata --name=RHR --author=john --author=jane",
    "bazaar template project update-metadata --name=RHR --version=2.0",
    "bazaar template project update-metadata --name=RHR --author=john --author=jane --version=v3",
  ];

  static flags = {
    ...ProjectTemplateFlags,
    ...ProjectConfigFlags,
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(TemplateProjectUpdateMetadataCommand);

    this.Info.start("Updating metadata");
    const projectTemplate = this.api.templates.project(flags.name);
    const result = await projectTemplate.updateMetadata({
      ...(flags.author ? { authors: flags.author } : {}),
      ...(flags.version ? { version: flags.version } : {}),
    });

    if (R.isOk(result)) {
      this.Info.success();
      return;
    }

    if (result.code === Project.ErrorCode.ProjectNotFound) {
      this.Info.failure();
      this.Warning.log(`The project template "${flags.name}" does not exist`);
      return;
    }

    if (result.code === Project.ErrorCode.ProjectNotValid) {
      this.Info.failure();
      const message = `The project template "${flags.name}" is not valid (missing baserom, invalid config, etc.)`;
      this.Warning.log(message);
      return;
    }

    if (result.code === Project.ErrorCode.ConfigIsEmpty) {
      this.Info.failure();
      const message = `No parameter was specified, you should specify at least author or version`;
      this.Warning.log(message);
      return;
    }

    this.Info.failure();
    const messages = R.messages(result, { verbose: true });
    this.Error(`Failed to update project template metadata\n${messages}`, 1);
  }
}
