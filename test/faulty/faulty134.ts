// Error: Utility type Record wrong value type
type PageInfo = Record<string, number>;
const pages: PageInfo = {
  home: 1,
  about: "2"
};
