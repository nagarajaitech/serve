import { User } from "./src/models/user";  // Import your User model if needed

declare global {
  namespace Express {
    interface Request {
      user?: User;  // Define `user` as a property of type `User`
    }
  }
}
