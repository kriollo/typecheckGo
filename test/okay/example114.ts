// Correct: Const assertion
const colors = ["red", "green", "blue"] as const;
const newColors = [...colors, "yellow"];
