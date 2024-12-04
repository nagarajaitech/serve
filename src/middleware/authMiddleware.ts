import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwtUtils";

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  const decoded = verifyToken(token,);
  if (!decoded) {
    return res.status(401).json({ message: "Invalid token." });
  }

  req.user = decoded; 
  next();
};
