// Error: Utility type Required wrong usage
interface Config {
  host?: string;
  port?: number;
}

const config: Required<Config> = { host: "localhost" };
