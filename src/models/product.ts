import mongoose, { Document, Schema } from "mongoose";

export interface Product extends Document {
  productname: string;
  description: string;
  price: number;
  images: string[]; 
  createdAt: Date;
  stock: number;
}

const productSchema = new Schema<Product>({
  productname: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  images: { type: [String], required: true },
  stock: { type: Number, required: true},
},
{ timestamps: true }
);

const ProductModel = mongoose.model<Product>("Product", productSchema);

export default ProductModel;
