import { Request, Response, NextFunction } from 'express';
import jwt,{JwtPayload } from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET_KEY ?? 'your_secret_key';
console.log('Secret Key used for signing:', SECRET_KEY);

export const generateToken = (userId: string): string => {
  console.log("Generating token for user ID:", userId);
  const payload = { id: userId };
  console.log("Payload:", payload);

  return jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
};


export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  console.log('Received token:', req.headers['authorization']);

  const token = req.headers['authorization'];
  if (!token) {
    res.status(401).json({ message: 'Access denied. No token provided.' });
    return;
  }

  try {
    const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
    console.log('Token value after stripping "Bearer":', tokenValue);

    const decoded = jwt.verify(tokenValue, SECRET_KEY) as JwtPayload;
    console.log('Decoded token:', decoded);

    req.user = { id: decoded.id };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ message: 'Invalid token' });
  }
};


