// Correct: Template literal type
type EventName = `on${Capitalize<string>}`;
const event: EventName = "onClick";
