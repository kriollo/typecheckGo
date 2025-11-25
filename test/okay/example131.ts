// Correct: Utility type Required
interface Config {
  host?: string;
  port?: number;
}

const config: Required<Config> = { host: "localhost", port: 3000 };
