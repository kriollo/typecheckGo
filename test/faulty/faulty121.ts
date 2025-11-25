// Error: Branded types wrong assignment
type UserId = string & { readonly brand: unique symbol };
const id: UserId = "user-123";
