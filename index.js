import dotenv from 'dotenv'
dotenv.config();
import express from 'express'
import cors from 'cors'
import { logger } from './logger/windston.js';
import router from './routes/index.js';
import mongoCtx from './db/connection.js';
import cookieParser from 'cookie-parser';
// import productSchema from './schemas/product.schema.js';
const app = express()
mongoCtx()
app.use(cookieParser());
app.use(express.json({limit:'10mb'}))
app.use(express.urlencoded({ extended: true }))
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});
app.use('/api/v1',router)

// async function deleteAllProducts() {
//   try {
//       // Delete all products that match the structure (draft: true, etc.)
//       const result = await productSchema.deleteMany({
//           draft: true,
//           categoryId: "68ac9291cebaeb05950ebaaa",
//           subCategoryId: "68ac9291cebaeb05950ebaab",
//           userId: "68bb02ec60e1cce1ea96102a",
//           image: null,
//           document: null
//       });

//       console.log(`Deleted ${result.deletedCount} products`);
//       return result;
//   } catch (error) {
//       console.error('Error deleting products:', error);
//       throw error;
//   }
// }

// deleteAllProducts()
//     .then(result => console.log('Deletion completed:', result))
//     .catch(error => console.error('Deletion failed:', error));


const PORT= process.env.PORT || 8000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} ✅`);
})