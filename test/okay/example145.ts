// Correct: Module augmentation
declare module "express" {
  interface Request {
    user: string;
  }
}

import { Request } from "express";
const req: Request = {} as Request;
req.user = "john";
