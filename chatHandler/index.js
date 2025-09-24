global.userSockets = global.userSockets || new Map();

import { Server as SocketIOServer } from 'socket.io';
import Chat from '../schemas/chat.schema.js';
import mongoose from 'mongoose';
import { approveRequirementOnChatStart } from '../controllers/requirement.controller.js';

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
  global.io = io; 
  const userSockets = global.userSockets;

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Listen for user identification (should be sent from frontend after connect)
    socket.on('identify', ({ userId }) => {
      if (!userId) return;
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      socket.userId = userId;
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      if (socket.userId && userSockets.has(socket.userId)) {
        userSockets.get(socket.userId).delete(socket.id);
        if (userSockets.get(socket.userId).size === 0) {
          userSockets.delete(socket.userId);
        }
      }
    });

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

      // Approve requirement if this is the product owner (buyer) joining chat for the first time
      approveRequirementOnChatStart({ productId, userId, sellerId })
        .then(result => {
          if (result.updated) {
            console.log(`Requirement approved for product ${productId} and user ${userId} (seller: ${sellerId})`);
          } else {
            console.log(`Requirement not approved: ${result.reason}`);
          }
        })
        .catch(err => {
          console.error("Error approving requirement on chat start:", err);
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
        const messages = chat?.messages || [];
        const lastMessage = chat?.lastMessage || (messages.length > 0 ? messages[messages.length - 1] : null);
        console.log(lastMessage,"lastMessage")
        socket.emit('chat_history', {
          roomId,
          messages,
          lastMessage,
          messageCount: messages.length,
          buyerUnreadCount: chat?.buyerUnreadCount || 0,
          sellerUnreadCount: chat?.sellerUnreadCount || 0
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
  
      // Reset unread count for the joining user and send chat history
      try {
        const updateField = userType === 'buyer' ? { buyerUnreadCount: 0 } : { sellerUnreadCount: 0 };
        const chat = await Chat.findOneAndUpdate(
          { roomId },
          { $set: updateField },
          { new: true }
        ).lean();
        const messages = chat?.messages || [];
        const lastMessage = chat?.lastMessage || (messages.length > 0 ? messages[messages.length - 1] : null);
        socket.emit('chat_history', {
          roomId,
          messages,
          lastMessage,
          messageCount: messages.length,
          buyerUnreadCount: chat?.buyerUnreadCount || 0,
          sellerUnreadCount: chat?.sellerUnreadCount || 0
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
        finalBuyerId = buyerId || socket.buyerId;
      }
  
      if (!finalBuyerId) {
        socket.emit('error', { message: 'Cannot determine buyerId for room' });
        return;
      }
  
      const sortedIds = [finalBuyerId, sellerId].sort();
      const roomId = `product_${productId}_buyer_${sortedIds[0]}_seller_${sortedIds[1]}`;
  
      // Save message to DB and update unread count
      try {
        const msgObj = {
          senderId: new mongoose.Types.ObjectId(senderId),
          senderType,
          message,
          timestamp: new Date()
        };
        // Determine which unread count to increment
        const unreadField = senderType === 'buyer' ? 'sellerUnreadCount' : 'buyerUnreadCount';
        const update = {
          $setOnInsert: {
            productId: new mongoose.Types.ObjectId(productId),
            buyerId: new mongoose.Types.ObjectId(finalBuyerId),
            sellerId: new mongoose.Types.ObjectId(sellerId),
            roomId
          },
          $push: { messages: msgObj },
          $set: { lastMessage: msgObj },
          $inc: { [unreadField]: 1 }
        };
        const chat = await Chat.findOneAndUpdate(
          { roomId },
          update,
          { upsert: true, new: true }
        ).lean();

        // Broadcast the message to everyone in the room (including sender for confirmation)
        io.to(roomId).emit('receive_message', {
          productId,
          message,
          senderId,
          senderType,
          timestamp: msgObj.timestamp,
          roomId,
          lastMessage: chat?.lastMessage || msgObj,
          messageCount: chat?.messages?.length || 0,
          buyerUnreadCount: chat?.buyerUnreadCount || 0,
          sellerUnreadCount: chat?.sellerUnreadCount || 0
        });

        // Emit last message update for sidebar/chat list
        io.to(roomId).emit('chat_last_message_update', {
          roomId,
          lastMessage: chat?.lastMessage || msgObj
        });

        // --- Notification logic for users not in the room ---
        // Determine recipient userId (opposite of sender)
        let notifyUserId;
        if (senderType === 'buyer') {
          notifyUserId = sellerId;
        } else {
          notifyUserId = finalBuyerId;
        }

        // Get all sockets for the recipient
        const recipientSockets = userSockets.get(String(notifyUserId));
        if (recipientSockets) {
          // Check if any of the recipient's sockets are NOT in the room
          for (const sockId of recipientSockets) {
            const recipientSocket = io.sockets.sockets.get(sockId);
            if (recipientSocket && !recipientSocket.rooms.has(roomId)) {
              recipientSocket.emit('new_message_notification', {
                roomId,
                lastMessage: chat?.lastMessage || msgObj,
                productId,
                sellerId,
                buyerId: finalBuyerId
              });
            }
          }
        }

        // Emit last message update for sidebar/chat list
        io.to(roomId).emit('chat_last_message_update', {
          roomId,
          lastMessage: chat?.lastMessage || msgObj
        });
  
        console.log(`Message sent in room ${roomId} by ${senderId} (${senderType}): "${message}"`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to save message', error: err.message });
        return;
      }
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
      
          // Real-time product notification event
          socket.on('send_product_notification', (data) => {
            const { userId, productId, title, description } = data;
            if (!userId || !productId || !title || !description) return;
            const recipientSockets = userSockets.get(String(userId));
            if (recipientSockets) {
              for (const sockId of recipientSockets) {
                const recipientSocket = io.sockets.sockets.get(sockId);
                if (recipientSocket) {
                  recipientSocket.emit('product_notification', {
                    productId,
                    title,
                    description
                  });
                }
              }
            }
          });
      }
    });
  });

  return io;
}
