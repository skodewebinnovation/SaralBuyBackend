import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "saralbuy",
    allowed_formats: [
      "jpg", "jpeg", "png", "webp",
      "pdf", "doc", "docx", "xls", "xlsx", "txt"
    ],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
    resource_type: "auto"
  }
});

// Single image upload middleware with 3MB limit
// const uploadSingleImage = multer({
//   storage,
//   limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
// }).single("image"); // "image" is already set

const uploadSingleImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).fields([
  { name: "image", maxCount: 1 },
  { name: "document", maxCount: 1 },
]);

export default uploadSingleImage;
