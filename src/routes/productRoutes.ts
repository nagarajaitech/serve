// Import dependencies
import express, { Request, Response } from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import ProductModel from "../models/product";
import { verifyToken } from "../utils/jwtUtils";
import { logRequestDetails } from "../utils/middleware";
import { sendEmail, transporter } from "../models/emailServer";

// Create router instance
const router = express.Router();

// Define the path for the uploads directory
const uploadsDir = path.join(__dirname, "../../uploads");
console.log("Upload:", uploadsDir);

// Middleware to serve static files
router.use("/uploads", express.static(uploadsDir, 
  { setHeaders: (res) => { res.setHeader("Cache-Control", "no-store"); 
    res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:;"); 
  }, 
}));

// Ensure the uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

// Filter for image files only
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase()) && allowedTypes.test(file.mimetype);

  if (!isValid) {
    cb(new Error("Only JPEG, JPG, PNG, and GIF are allowed."));
  } else {
    cb(null, true);
  }
};

// Set up multer
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Middleware for authentication and logging
router.use(verifyToken, logRequestDetails);


// Route to create a product
router.post("/create", upload.array("images", 5), async (req: Request, res: Response): Promise<void> => {
  try {
    const { productname, description, price, stock } = req.body;
    const uploadedFiles = req.files as Express.Multer.File[];
    const imagePaths = uploadedFiles.map((file) => `uploads/${file.filename}`);

    if (!productname || !description || !price || stock === undefined) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const newProduct = new ProductModel({
      productname,
      description,
      price: parseFloat(price),
      images: imagePaths,
      stock,
    });

    await newProduct.save();
    res.status(201).json({ message: "Product created", product: newProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Server error", error: error instanceof Error ? error.message : "Unknown error" });
  }
});


// Route to get all products
router.get("/", async (req: Request, res: Response): Promise<void> => { 
  try { const products = await ProductModel.find(); 
    console.log("Products with image URLs:", products); 
    const productsWithImages = products.map(product => ({ ...product.toObject(), 
      imageUrls: product.images.map(imagePath => {
         const imageUrl = `http://localhost:5000/uploads/${path.basename(imagePath)}`;
          console.log("Generated image URL:", imageUrl); return imageUrl; 
        }),
         })); res.status(200).json(productsWithImages);
         }
          catch (error) { console.error("Error fetching products:", error); 
            res.status(500).json({ message: "Server error", 
              error: error instanceof Error ? error.message : "Unknown error" });
           } 
});

// Update a Product
router.put(
  "/update/:id",
  upload.array("images"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { productname, description, price, stock } = req.body;
      const productId = req.params.id;
      let imagePaths: string[] = [];

      if (req.files && Array.isArray(req.files)) {
        imagePaths = (req.files).map(
          (file) => `/uploads/${file.filename}`
        );
      }

      if (req.body.images && Array.isArray(req.body.images)) {
        imagePaths = [...imagePaths, ...req.body.images];
      }

      if (imagePaths.length === 0) {
        res.status(400).json({ message: "At least one image is required" });
        return;
      }

      const updatedProduct = await ProductModel.findByIdAndUpdate(
        productId,
        { productname, description, price, images: imagePaths, stock },
        { new: true }
      );

      if (!updatedProduct) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      res
        .status(200)
        .json({ message: "Product updated", product: updatedProduct });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: "Server error", error: error.message });
      } else {
        res.status(500).json({ message: "Unknown error" });
      }
    }
  }
);

// Delete a Product
router.delete(
  "/delete/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = req.params.id;
      const deletedProduct = await ProductModel.findByIdAndDelete(productId);

      if (!deletedProduct) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      res.status(200).json({ message: "Product deleted" });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).json({ message: "Server error", error: error.message });
      } else {
        res.status(500).json({ message: "Unknown error" });
      }
    }
  }
);

// filter
router.get(
  "/filter",
  verifyToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { productname, createdDate, stock } = req.query;
      const filter: Record<string, unknown> = {};

      // Filter by product name if provided
      if (productname) {
        filter.productname = { $regex: productname, $options: "i" };
      }

      // Filter by creation date if provided
      if (createdDate) {
        const dateFilter = new Date(createdDate as string);
        if (isNaN(dateFilter.getTime())) {
          res.status(400).json({ message: "Invalid date format" });
          return; // Ensures the function exits here after sending the response
        }
        filter.createdAt = { $gte: dateFilter };
      }

      // Filter by stock level if provided
      if (stock !== undefined) {
        const stockLevel = parseInt(stock as string, 10);
        if (isNaN(stockLevel)) {
          res.status(400).json({ message: "Invalid stock value" });
          return; // Ensures the function exits here after sending the response
        }
        filter.stock = stockLevel;
      }

      const products = await ProductModel.find(filter);

      if (products.length === 0) {
        res
          .status(404)
          .json({ message: "No products found matching the criteria" });
        return; // Ensures the function exits here after sending the response
      }

      res.status(200).json(products);
    } catch (error: unknown) {
      console.error("Error filtering products:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: "Server error", error: error.message });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  }
);

//email
router.post(
  "/send-email",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { to, subject, product, attachmentFilePaths } = req.body;
      if (!product || !product.productname) {
        res.status(400).json({ message: "Product data is missing" });
        return;
      }
      console.log("Received attachment file paths:", attachmentFilePaths);
      await sendEmail(to, subject, product, attachmentFilePaths);
      res.status(200).json({ message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({
        message: "Error sending email",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

//all product
router.post(
  "/send-emails-to-all",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const products = await ProductModel.find();
      if (products.length === 0) {
        res.status(404).json({ message: "No products found in the database" });
        return;
      }

      const htmlContent = `
      <h2>All Product Details</h2>
      ${products
        .map(
          (product) => `
        <h3>Product: ${product.productname}</h3>
        <table border="2" style="border-collapse: collapse; width: 100%; text-align: left;">
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
              <td style="padding: 8px;">${product.description || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px;">Price</td>
              <td style="padding: 8px;">${product.price.toFixed(2)}$</td>
            </tr>
            <tr>
              <td style="padding: 8px;">Stock</td>
              <td style="padding: 8px;">${product.stock || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px;">Images</td>
              <td style="padding: 8px;">
                ${
                  Array.isArray(product.images) && product.images.length > 0
                    ? product.images
                        .map(
                          (img: string) =>
                            `<img src="${img}" alt="Product Image" width="100" style="margin-right: 5px;" />`
                        )
                        .join("")
                    : "No images available"
                }
              </td>
            </tr>
          </tbody>
        </table>
        <hr style="border-top: 1px solid #ddd;" />
      `
        )
        .join("")}
    `;

      const to = req.body.to;
      const subject = `Product Details for All Products`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully.");
      res
        .status(200)
        .json({ message: "Email sent successfully with all products" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({
        message: "Error sending email",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
