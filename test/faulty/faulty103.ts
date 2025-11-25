// Error: Template literal type mismatch
type EventName = `on${Capitalize<string>}`;
const event: EventName = "click";
