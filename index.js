import dotenv from 'dotenv'
dotenv.config();
import express from 'express'
import cors from 'cors'
import { logger } from './logger/windston.js';
import router from './routes/index.js';
import mongoCtx from './db/connection.js';
const app = express()
mongoCtx()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});
app.use('/api/v1',router)






const PORT= process.env.PORT || 8000
app.listen(PORT, () => {
  console.log("Server is running on port 3000 ✅");
})