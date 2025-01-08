const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');  // Import path module
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
});
// app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Correct the usage of 'join' from 'path' module
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "./index.html"));  // Corrected line
});

// Store users with their socket IDs (optional)
const users = new Map();

// Middleware
app.use(express.json());

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Optionally associate a username with the socket ID (e.g., upon user login)
    socket.on('setUsername', (username) => {
        users.set(socket.id, username);
        console.log(`${username} connected with socket id: ${socket.id}`);
    });

    // Listen for messages and send them to the target socket or broadcast
    socket.on('sendMessage', (data, callback) => {
        const sender = users.get(socket.id)
        // Get the sender's name or default to 'Anonymous'
        console.log('Message received:', data);

        // If data.targetSocketId is provided, send the message to that specific user
        if (data.targetSocketId) {
            const targetSocket = io.sockets.sockets.get(data.targetSocketId);
            if (targetSocket) {
                targetSocket.emit('receiveMessage', { message: data.message, sender, socketId: socket.id });
            }
        } else {
            // Otherwise, broadcast the message to all clients
            io.emit('receiveMessage', { message: data.message, sender, socketId: socket.id });
        }

        // Check if the callback is a function before calling it
        if (typeof callback === 'function') {
            callback({ status: 'Message received' });
        }
    });


    // Handle typing event
    socket.on('typing', () => {
        socket.broadcast.emit('userTyping', socket.id); // Notify others
    });

    // Handle room joining
    socket.on('joinRoom', (roomName) => {
        socket.join(roomName); // Join a specific room
        console.log(`User with socket id: ${socket.id} joined room: ${roomName}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        users.delete(socket.id); // Remove the user from the users map
    });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
