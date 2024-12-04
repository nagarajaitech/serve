import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Product } from './product';

dotenv.config();

// Check for required environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  throw new Error('Email user or password is not set in the environment variables.');
} 

// Create a transporter instance using nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 587,
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  logger: true,
  debug: true,
});

// Helper function to check if a file exists
const fileExists = (filePath: string): boolean => {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    console.error(`Error checking file existence for ${filePath}:`, err);
    return false;
  }
};

// Helper function to validate if a file is a PDF
const isPdfFile = (filePath: string): boolean => {
  return path.extname(filePath).toLowerCase() === '.pdf' || path.extname(filePath).toLowerCase() === '.txt';

};

// Helper function to add attachments
const addAttachments = (filePaths: string[]): nodemailer.SendMailOptions['attachments'] => {
  return filePaths
    .filter(fileExists) // Only include files that exist
    .filter((filePath) => {
      if (!isPdfFile(filePath)) {
        console.warn(`Skipping non-PDF file: ${filePath}`);
        return false;
      }
      return true;
    })
    .map((filePath) => {
      const resolvedPath = path.resolve(filePath);
      console.log(`Adding attachment: ${resolvedPath}`);
      return {
        filename: path.basename(filePath),
        path: resolvedPath,
        contentType: 'application/pdf',
      };
    });
};

// Function to send an email with product details and optional attachments
export const sendEmail = async (
  to: string,
  subject: string,
  product: Product,
  attachmentFilePaths?: string[]
): Promise<void> => {
  // Validate product data
  if (!product || !product.productname || !product.price) {
    throw new Error('Product data is incomplete or invalid.');
  }

  // Generate HTML content for the email
  const htmlContent = `
    <h2>Product Details</h2>
    <table border="1" style="border-collapse: collapse; width: 100%; text-align: left;">
      <thead>
        <tr>
          <th style="padding: 8px; background-color: #f2f2f2;">Field</th>
          <th style="padding: 8px; background-color: #f2f2f2;">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 8px;">Product Name</td>
          <td style="padding: 8px;">${product.productname}</td>
        </tr>
        <tr>
          <td style="padding: 8px;">Description</td>
          <td style="padding: 8px;">${product.description || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px;">Price</td>
          <td style="padding: 8px;">$${product.price.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px;">Stock</td>
          <td style="padding: 8px;">${product.stock || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px;">Images</td>
          <td style="padding: 8px;">
            ${
              Array.isArray(product.images) && product.images.length > 0
                ? product.images
                    .map((img: string) => `<img src="${img}" alt="Product Image" width="100" style="margin-right: 5px;" />`)
                    .join('')
                : 'No images available'
            }
          </td>
        </tr>
      </tbody>
    </table>
  `;

  // Initialize attachments
  console.log('Attachment file paths before processing:', attachmentFilePaths);
  const attachments: nodemailer.SendMailOptions['attachments'] = attachmentFilePaths ? addAttachments(attachmentFilePaths) : [];
  console.log('Attachments after processing:', attachments);

  // Email options configuration
  const mailOptions: nodemailer.SendMailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html: htmlContent,
    attachments,
  };

  // Send the email
  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', to);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email.');
  }
};

export { transporter };