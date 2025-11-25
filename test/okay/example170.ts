// Correct: Template literal type
type HTTPMethod = "GET" | "POST";
type Endpoint = `/${string}`;
type Route = `${HTTPMethod} ${Endpoint}`;

const route: Route = "GET /users";
