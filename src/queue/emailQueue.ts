import Bull from "bull";
import nodemailer from "nodemailer";

// Create a Bull queue for email sending
const emailQueue = new Bull('emailQueue', {
  redis: { host: 'localhost', port: 6379 } 
});

// Configure the email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
});

// Define the email job processor
emailQueue.process(async (job) => {
  const { to, subject, text } = job.data;
  
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
    console.log('Welcome back email sent to:', to);
  } catch (error) {
    console.error('Error sending welcome back email:', error);
    throw error;
  }
});

export default emailQueue;
