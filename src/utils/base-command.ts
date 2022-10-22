import { Command, Config, Flags, Interfaces } from "@oclif/core";
import Api from "../api";
import FSNode from "./fs-node";
import TE from "./text-effect";

enum LogLevel {
  Debug = "debug",
  Info = "info",
  Warn = "warn",
  Error = "error",
}

export type BaseFlags<T extends typeof Command> = Interfaces.InferredFlags<
  typeof BaseCommand["globalFlags"] & T["flags"]
>;

export default abstract class BaseCommand<
  T extends typeof Command,
> extends Command {
  static globalFlags = {
    "log-level": Flags.enum<LogLevel>({
      summary: "Specify level for logging.",
      options: Object.values(LogLevel),
      default: LogLevel.Info,
      helpGroup: "GLOBAL",
    }),
  };

  protected flags!: BaseFlags<T>;
  protected api: Api;

  public constructor(argv: string[], config: Config) {
    super(argv, config);
    this.api = new Api(FSNode, this.config.cacheDir);
  }

  public async init(): Promise<void> {
    await super.init();
    const constructor = this.constructor as Interfaces.Command.Class;
    const { flags } = await this.parse(constructor);
    this.flags = flags;
  }

  protected async catch(err: Error & { exitCode?: number }): Promise<any> {
    return super.catch(err);
  }

  protected async finally(_: Error | undefined): Promise<any> {
    return super.finally(_);
  }

  protected Debug = async (message: string): Promise<void> => {
    const logLevel = this.flags["log-level"];
    if (logLevel !== LogLevel.Debug) {
      return;
    }

    this.log(TE.dim(`${TE.b("Debug:")} ${message}`));
  };

  protected Info = async (message: string): Promise<void> => {
    const logLevel = this.flags["log-level"];
    if (logLevel !== LogLevel.Debug && logLevel !== LogLevel.Info) {
      return;
    }

    this.log(TE.info(`${TE.b("Info:")} ${message}`));
  };

  protected Warn = async (message: string): Promise<void> => {
    const logLevel = this.flags["log-level"];
    if (logLevel === LogLevel.Error) {
      return;
    }

    this.log(TE.warning(`${TE.b("Warn:")} ${message}`));
  };

  protected Error = (
    message: string,
    exit: number,
    options: { suggestions?: string[]; ref?: string } = {},
  ): void => {
    this.error(TE.failure.b(message), {
      exit,
      suggestions: options.suggestions,
      ref: options.ref,
    });
  };
}
