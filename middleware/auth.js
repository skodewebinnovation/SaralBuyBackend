import jwt from 'jsonwebtoken';
import { ApiResponse } from '../helper/ApiReponse.js';

const auth = (req, res, next) => {

  const token =req.cookies?.authToken 


  if (!token) return ApiResponse.errorResponse(res, 401, 'Token not found');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded)
    req.user = decoded;
    next();
  } catch (err) {
    ApiResponse.errorResponse(res, 401, 'Invalid token');
  }
};

export default auth;