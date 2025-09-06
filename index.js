import dotenv from 'dotenv'
dotenv.config();
import express from 'express'
import cors from 'cors'
import { logger } from './logger/windston.js';
import router from './routes/index.js';
import mongoCtx from './db/connection.js';
import cookieParser from 'cookie-parser';
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


const PORT= process.env.PORT || 8000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} ✅`);
})