// chatHandler/index.js
import { Server as SocketIOServer } from 'socket.io';
import Chat from '../schemas/chat.schema.js';
import mongoose from 'mongoose';

export default function chatHandler(server) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: ['http://localhost:5173','https://kaleidoscopic-pika-c2b489.netlify.app'],
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Handle joining a chat room
    socket.on('join_room', (data) => {
      const { userId, productId, sellerId, userType } = data;
      
      // Validate required fields
      if (!userId || !productId || !sellerId || !userType) {
        socket.emit('error', { message: 'Missing required fields: userId, productId, sellerId, or userType' });
        return;
      }
      
      // FIXED: Determine buyerId based on userType
      let buyerId;
      if (userType === 'buyer') {
        buyerId = userId; // Current user is buyer
      } else {
        // userType === 'seller', so we need the buyerId from somewhere
        // For seller joining, we expect buyerId to be passed or derived
        // Since seller joins with sellerId === userId, we need buyerId from the data
        buyerId = data.buyerId || userId; // fallback to userId if buyerId not provided
      }
      
      // Create a consistent room ID - ALWAYS use the same order
      // Sort buyerId and sellerId to ensure consistency
      const sortedIds = [buyerId, sellerId].sort();
      const roomId = `product_${productId}_buyer_${sortedIds[0]}_seller_${sortedIds[1]}`;
      
      // Join the room
      socket.join(roomId);
      
      // Store user information in socket session
      socket.userId = userId;
      socket.productId = productId;
      socket.sellerId = sellerId;
      socket.buyerId = buyerId;
      socket.userType = userType;
      socket.roomId = roomId;
      
      console.log(`User ${userId} (${userType}) joined room ${roomId} for product ${productId}`);
      console.log(`Room participants - Buyer: ${buyerId}, Seller: ${sellerId}`);
      
      // Notify others in the room that a user has joined
      socket.to(roomId).emit('user_joined', {
        userId,
        userType,
        message: `${userType} has joined the chat`
      });
      
      // Confirm room joining to the user
      socket.emit('room_joined', {
        roomId,
        buyerId,
        sellerId,
        message: `You have joined the chat for product ${productId}`
      });
    });

    // Fetch chat history when joining a room
    socket.on('get_chat_history', async (data) => {
      const { productId, sellerId, buyerId } = data;
      if (!productId || !sellerId || !buyerId) {
        socket.emit('error', { message: 'Missing required fields for fetching chat history' });
        return;
      }
      const sortedIds = [buyerId, sellerId].sort();
      const roomId = `product_${productId}_buyer_${sortedIds[0]}_seller_${sortedIds[1]}`;
      try {
        const chat = await Chat.findOne({ roomId }).lean();
        socket.emit('chat_history', {
          roomId,
          messages: chat?.messages || []
        });
      } catch (err) {
        socket.emit('error', { message: 'Failed to fetch chat history', error: err.message });
      }
    });

    // When joining a room, send chat history to the user
    socket.on('join_room', async (data) => {
      const { userId, productId, sellerId, userType } = data;

      // Validate required fields
      if (!userId || !productId || !sellerId || !userType) {
        socket.emit('error', { message: 'Missing required fields: userId, productId, sellerId, or userType' });
        return;
      }

      // Determine buyerId based on userType
      let buyerId;
      if (userType === 'buyer') {
        buyerId = userId; // Current user is buyer
      } else {
        // userType === 'seller', so we need the buyerId from somewhere
        buyerId = data.buyerId || userId; // fallback to userId if buyerId not provided
      }

      // Create a consistent room ID - ALWAYS use the same order
      const sortedIds = [buyerId, sellerId].sort();
      const roomId = `product_${productId}_buyer_${sortedIds[0]}_seller_${sortedIds[1]}`;

      // Join the room
      socket.join(roomId);

      // Store user information in socket session
      socket.userId = userId;
      socket.productId = productId;
      socket.sellerId = sellerId;
      socket.buyerId = buyerId;
      socket.userType = userType;
      socket.roomId = roomId;

      console.log(`User ${userId} (${userType}) joined room ${roomId} for product ${productId}`);
      console.log(`Room participants - Buyer: ${buyerId}, Seller: ${sellerId}`);

      // Notify others in the room that a user has joined
      socket.to(roomId).emit('user_joined', {
        userId,
        userType,
        message: `${userType} has joined the chat`
      });

      // Confirm room joining to the user
      socket.emit('room_joined', {
        roomId,
        buyerId,
        sellerId,
        message: `You have joined the chat for product ${productId}`
      });

      // Fetch and send chat history
      try {
        const chat = await Chat.findOne({ roomId }).lean();
        socket.emit('chat_history', {
          roomId,
          messages: chat?.messages || []
        });
      } catch (err) {
        socket.emit('error', { message: 'Failed to fetch chat history', error: err.message });
      }
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      const { productId, sellerId, message, senderId, senderType, buyerId } = data;

      // Validate required fields
      if (!productId || !sellerId || !message || !senderId || !senderType) {
        socket.emit('error', { message: 'Missing required fields for sending message' });
        return;
      }

      // Use consistent room ID logic
      let finalBuyerId;
      if (senderType === 'buyer') {
        finalBuyerId = senderId;
      } else {
        // Sender is seller, use buyerId from data or socket session
        finalBuyerId = buyerId || socket.buyerId;
      }

      if (!finalBuyerId) {
        socket.emit('error', { message: 'Cannot determine buyerId for room' });
        return;
      }

      const sortedIds = [finalBuyerId, sellerId].sort();
      const roomId = `product_${productId}_buyer_${sortedIds[0]}_seller_${sortedIds[1]}`;

      // Save message to DB
      try {
        const msgObj = {
          senderId: new mongoose.Types.ObjectId(senderId),
          senderType,
          message,
          timestamp: new Date()
        };
        await Chat.findOneAndUpdate(
          { roomId },
          {
            $setOnInsert: {
              productId: new mongoose.Types.ObjectId(productId),
              buyerId: new mongoose.Types.ObjectId(finalBuyerId),
              sellerId: new mongoose.Types.ObjectId(sellerId),
              roomId
            },
            $push: { messages: msgObj }
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        socket.emit('error', { message: 'Failed to save message', error: err.message });
        return;
      }

      // Broadcast the message to everyone in the room (including sender for confirmation)
      io.to(roomId).emit('receive_message', {
        productId,
        message,
        senderId,
        senderType,
        timestamp: new Date(),
        roomId // for debugging
      });

      console.log(`Message sent in room ${roomId} by ${senderId} (${senderType}): "${message}"`);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { productId, userId, sellerId, buyerId } = data;
      if (!productId || !userId || !sellerId) return;
      
      // Determine final buyerId
      const finalBuyerId = buyerId || (socket.userType === 'buyer' ? userId : socket.buyerId);
      if (!finalBuyerId) return;
      
      const sortedIds = [finalBuyerId, sellerId].sort();
      const roomId = `product_${productId}_buyer_${sortedIds[0]}_seller_${sortedIds[1]}`;
      
      socket.to(roomId).emit('user_typing', {
        userId,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { productId, userId, sellerId, buyerId } = data;
      if (!productId || !userId || !sellerId) return;
      
      // Determine final buyerId
      const finalBuyerId = buyerId || (socket.userType === 'buyer' ? userId : socket.buyerId);
      if (!finalBuyerId) return;
      
      const sortedIds = [finalBuyerId, sellerId].sort();
      const roomId = `product_${productId}_buyer_${sortedIds[0]}_seller_${sortedIds[1]}`;
      
      socket.to(roomId).emit('user_typing', {
        userId,
        isTyping: false
      });
    });

    // Handle user disconnects
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
      
      // If the socket was in a room, notify others that the user left
      if (socket.roomId) {
        socket.to(socket.roomId).emit('user_left', {
          userId: socket.userId,
          userType: socket.userType,
          message: `${socket.userType} has left the chat`
        });
      }
    });
  });

  return io;
}