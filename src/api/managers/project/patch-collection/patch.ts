import { z } from "zod";
import { R, ResultVoid } from "../../../utils/result";
import { ConfigurableErrorCodes } from "../../configurable";
import Resource, { ResourceErrorCodes } from "../../resource";

const PatchConfigSchema = z.object({
  mainFileRelativePath: z.string(),
  authors: z.array(z.string()),
  version: z.string(),
});

export type PatchConfig = z.infer<typeof PatchConfigSchema>;

export enum PatchErrorCode {
  Internal,
  CodeDirectoryNotFound,
  CodeDirectoryNotValid,
  InputMainFileNotFound,
  InputMainFileNotValid,
  MainFileNotFound,
  MainFileNotValid,
  PatchAlreadyExists,
}

export type PatchExtraErrorCodes = {
  Snapshot: PatchErrorCode.Internal;
  Validate:
    | ConfigurableErrorCodes["LoadConfig"]
    | PatchErrorCode.CodeDirectoryNotFound
    | PatchErrorCode.CodeDirectoryNotValid
    | PatchErrorCode.MainFileNotFound
    | PatchErrorCode.MainFileNotValid;
  ValidateConfig: never;
  ValidateInputConfig:
    | PatchErrorCode.InputMainFileNotFound
    | PatchErrorCode.InputMainFileNotValid;
};

export type PatchErrorCodes = {
  CreateFromSingleFile:
    | PatchErrorCodes["ValidateInputConfig"]
    | PatchErrorCode.Internal
    | PatchErrorCode.PatchAlreadyExists;
  Snapshot:
    | ResourceErrorCodes["Snapshot"]
    | PatchExtraErrorCodes["Snapshot"]
    | PatchErrorCodes["Validate"]
    | PatchErrorCodes["ValidateInputConfig"];
  Validate: ResourceErrorCodes["Validate"] | PatchExtraErrorCodes["Validate"];
  ValidateInputConfig:
    | ResourceErrorCodes["ValidateInputConfig"]
    | PatchExtraErrorCodes["ValidateInputConfig"];
};

export default class Patch extends Resource<PatchConfig, PatchExtraErrorCodes> {
  protected id = "Patch";

  protected ConfigSchema = PatchConfigSchema;
  protected defaultConfig?: PatchConfig;

  private _codeDirectoryPath(...paths: string[]): string {
    return this.path("Code", ...paths);
  }

  protected async validateInputConfig(
    partialConfig?: Partial<PatchConfig>,
  ): Promise<ResultVoid<PatchErrorCodes["ValidateInputConfig"]>> {
    const scope = this.scope("_validateInputConfig");

    if (partialConfig?.mainFileRelativePath) {
      // In the input config, we use the relative path as an absolute path.
      const mainFilePath = partialConfig.mainFileRelativePath;

      this.logger.start("Checking if input main file exists");
      const exists = await this.fs.exists(mainFilePath);
      if (!exists) {
        this.logger.failure();
        const message = `Input main file "${mainFilePath}" doesn't exist`;
        return R.Error(scope, message, PatchErrorCode.InputMainFileNotFound);
      }
      this.logger.success();

      this.logger.start("Checking if input main file is valid");
      const isFile = await this.fs.isFile(mainFilePath);
      const extension = this.fs.getExtension(mainFilePath);
      if (!isFile || extension !== "asm") {
        this.logger.failure();
        const message = `Input main file "${mainFilePath}" is not valid`;
        return R.Error(scope, message, PatchErrorCode.InputMainFileNotValid);
      }
      this.logger.success();
    }

    return R.Void;
  }

  async validate(): Promise<ResultVoid<PatchErrorCodes["Validate"]>> {
    const scope = this.scope("validate");

    this.logger.start("Load config");
    const configResult = await this.loadConfig();
    if (R.isError(configResult)) {
      this.logger.failure;
      return configResult;
    }
    this.logger.success();

    const mainFilePath = this._codeDirectoryPath(
      configResult.data.mainFileRelativePath,
    );

    this.logger.start(`Checking if code directory exists exists`);
    const codeDirectoryExists = await this.fs.exists(this._codeDirectoryPath());
    if (!codeDirectoryExists) {
      this.logger.failure();
      const message = `Code directory "${this._codeDirectoryPath()}" doesn't exist`;
      return R.Error(scope, message, PatchErrorCode.CodeDirectoryNotFound);
    }
    this.logger.success();

    this.logger.start(`Checking if code directory is valid`);
    const codeDirectoryIsValid = await this.fs.isDirectory(
      this._codeDirectoryPath(),
    );
    if (!codeDirectoryIsValid) {
      this.logger.failure();
      const message = `Code directory "${this._codeDirectoryPath()}" is not valid`;
      return R.Error(scope, message, PatchErrorCode.CodeDirectoryNotValid);
    }
    this.logger.success();

    this.logger.start(`Checking if main code file exists`);
    const mainFilePathExists = await this.fs.exists(mainFilePath);
    if (!mainFilePathExists) {
      this.logger.failure();
      const message = `Main code file "${mainFilePath}" is not valid`;
      return R.Error(scope, message, PatchErrorCode.MainFileNotFound);
    }
    this.logger.success();

    this.logger.start(`Checking if code main file is valid`);
    const mainFilePathIsFile = await this.fs.isFile(mainFilePath);
    if (!mainFilePathIsFile) {
      this.logger.failure();
      const message = `Main code file "${mainFilePath}" is not valid`;
      return R.Error(scope, message, PatchErrorCode.MainFileNotFound);
    }
    this.logger.success();

    return R.Void;
  }

  async snapshot(
    targetPatch: Patch,
    config?: Partial<PatchConfig> | undefined,
    partialOptions?:
      | Partial<{ force: boolean; config: Partial<PatchConfig> }>
      | undefined,
  ): Promise<ResultVoid<PatchErrorCodes["Snapshot"]>> {
    const scope = this.scope("snapshot");

    const snapshotResult = await super.snapshot(
      targetPatch,
      config,
      partialOptions,
    );
    if (R.isError(snapshotResult)) {
      return snapshotResult;
    }

    this.logger.start("Copying code directory");
    const copyCodeDirectoryResult = await this.fs.copyDirectory(
      this._codeDirectoryPath(),
      targetPatch._codeDirectoryPath(),
    );
    if (R.isError(copyCodeDirectoryResult)) {
      this.logger.failure();
      return R.Stack(
        copyCodeDirectoryResult,
        scope,
        `Failed to copy code directory from "${this._codeDirectoryPath()}" to "${targetPatch._codeDirectoryPath()}"`,
        PatchErrorCode.Internal,
      );
    }
    this.logger.success();

    return R.Void;
  }

  async createFromSingleFile(
    sourceCodeFilePath: string,
    partialConfig: Partial<Omit<PatchConfig, "mainFileRelativePath">>,
  ): Promise<ResultVoid<PatchErrorCodes["CreateFromSingleFile"]>> {
    const scope = this.scope("createFromSingleFile");

    const inputConfig: PatchConfig = {
      mainFileRelativePath: sourceCodeFilePath,
      authors: partialConfig.authors ?? [],
      version: partialConfig.version ?? "",
    };

    this.logger.start("Validating input config");
    const validateInputConfigResult = await this.validateInputConfig(
      inputConfig,
    );
    if (R.isError(validateInputConfigResult)) {
      this.logger.failure();
      return validateInputConfigResult;
    }
    this.logger.success();

    this.logger.start("Checking if the project doesn't already exist");
    const exists = await this.exists();
    if (exists) {
      this.logger.failure();
      const message = `Project "${this.path()}" already exists`;
      return R.Error(scope, message, PatchErrorCode.PatchAlreadyExists);
    }
    this.logger.success();

    this.logger.start("Creating patch directory");
    const createDirectoryResult = await this.createDirectory();
    if (R.isError(createDirectoryResult)) {
      this.logger.failure();
      const message = `Failed to create patch directory "${this.path()}"`;
      return R.Stack(
        createDirectoryResult,
        scope,
        message,
        PatchErrorCode.Internal,
      );
    }
    this.logger.success();

    const config: PatchConfig = {
      mainFileRelativePath: this.fs.getName(sourceCodeFilePath),
      authors: inputConfig.authors,
      version: inputConfig.version,
    };

    this.logger.start("Saving metadata");
    const saveConfigResult = await this.saveConfig(config);
    if (R.isError(saveConfigResult)) {
      this.logger.failure();
      const message = `Failed to save metadata`;
      return R.Stack(saveConfigResult, scope, message, PatchErrorCode.Internal);
    }
    this.logger.success();

    this.logger.start("Copying code file");
    const targetCodeFilePath = this._codeDirectoryPath(
      config.mainFileRelativePath,
    );
    const copyCodeFileResult = await this.fs.copyFile(
      sourceCodeFilePath,
      targetCodeFilePath,
    );
    if (R.isError(copyCodeFileResult)) {
      this.logger.failure();
      const message = `Failed to copy code file from "${sourceCodeFilePath}" to "${targetCodeFilePath}"`;
      return R.Stack(
        copyCodeFileResult,
        scope,
        message,
        PatchErrorCode.Internal,
      );
    }
    this.logger.success();

    return R.Void;
  }
}