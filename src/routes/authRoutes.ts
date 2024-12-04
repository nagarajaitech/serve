import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwtUtils";
import User from "../models/user";
import { logRequestDetails } from "../utils/middleware";


const router = Router();
router.use(logRequestDetails);

// Login route
router.post("/login", async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
  
    try {
      const user = await User.findOne({ email });
      if (!user) {
        res.status(400).json({ message: "Invalid credentials" });
        return;
      }
  
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(400).json({ message: "Invalid credentials" });
        return;
      }
  
      const token = generateToken(user.id);
  
      res.status(200).json({ 
        message: "Login successful", 
        token, 
        username: user.username  
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Login error:", error); 
        res.status(500).json({ message: "Server error", error: error.message });
      } else {
        console.error("Unexpected error:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  });
  

// Register route
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body; 
  
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,  
      email,
      password: hashedPassword,
    });
    await newUser.save();

    const token = generateToken(newUser.id);

    // Add a job to the email queue to send a welcome email
    // await emailQueue.add({
    //   to: newUser.email,
    //   subject: "Welcome to Our Platform",
    //   text: `Hello ${newUser.username},\n\nWelcome to our platform! We are excited to have you onboard.\n\nBest regards,\nTeam`
    // });

    res.status(201).json({ message: "User registered successfully", token });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Registration error:", error); 
      res.status(500).json({ message: "Server error", error: error.message });
    } else {
      console.error("Unexpected error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
});
  

export default router;
