// Error: Excess property checking
interface Config {
  timeout: number;
}

const config: Config = {
  timeout: 5000,
  retries: 3
};
