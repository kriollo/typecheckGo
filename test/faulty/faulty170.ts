// Error: Template literal type wrong pattern
type HTTPMethod = "GET" | "POST";
type Endpoint = `/${string}`;
type Route = `${HTTPMethod} ${Endpoint}`;

const route: Route = "DELETE /users";
