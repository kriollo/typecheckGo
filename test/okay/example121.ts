// Correct: Branded types
type UserId = string & { readonly brand: unique symbol };
function createUserId(id: string): UserId {
  return id as UserId;
}
const id: UserId = createUserId("user-123");
