import express from 'express';
import * as userController from '../controllers/user.controller.js';
import auth from '../middleware/auth.js';
import upload from '../middleware/multer.js';

const router = express.Router();

router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/logout', auth, userController.logoutUser);

router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);

router.post('/address', auth, userController.addAddress);

router.post('/aadhaar', auth, upload.single('aadhaarImage'), userController.verifyAadhaar);

export default router;