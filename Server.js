const express = require('express');
const dotenv = require('dotenv').config();
const cookieParser = require('cookie-parser');
const db = require('./Models/index.js'); // Update the import path for models
const userRoutes = require('./Routes/userRoutes.js');
const hostRoutes = require('./Routes/hostRoutes');
const adminRoutes = require('./Routes/adminRoutes');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const helmet = require('helmet');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');

// Setting up your port
const PORT = process.env.PORT || 2000;

// Assigning the variable app to express
const app = express();

// Creating HTTP server
const server = http.createServer(app);
app.use('/uploads', express.static(path.join(__dirname, './uploads')));

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: ['http://spintrip.in', 'http://localhost', 'http://localhost:3000']
    }
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
});

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

// Middleware
app.use(helmet());
app.use(cors({ origin: ['http://spintrip.in', 'http://localhost', 'http://localhost:3000'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression());
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Custom method for serving images from uploads
app.get('/uploads/:userId/:imageName', (req, res) => {
    const { userId, imageName } = req.params;
    const imagePath = path.join(__dirname, './uploads', userId, imageName);

    // Check if file exists
    if (fs.existsSync(imagePath)) {
        // You can add additional logic here if needed
        res.sendFile(imagePath);
    } else {
        res.status(404).send('Image not found');
    }
});

app.get('/uploads/host/CarAdditional/:carId/:imageName', (req, res) => {
    const { carId, imageName } = req.params;
    const imagePath = path.join(__dirname, './uploads/host/CarAdditional', carId, imageName);

    // Check if file exists
    if (fs.existsSync(imagePath)) {
        // You can add additional logic here if needed
        res.sendFile(imagePath);
    } else {
        res.status(404).send('Image not found');
    }
});

// Routes
app.use('/user', userRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/host', hostRoutes);

// Synchronizing the database
db.sequelize.sync().then(() => {
    console.log('Database is connected');
});

// Default route
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Under Maintenance</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; }
                .message { color: #ff6600; }
            </style>
        </head>
        <body>
            <div class="message">
                <h1>Our site is currently under maintenance.</h1>
                <p>We apologize for the inconvenience and appreciate your patience.</p>
            </div>
        </body>
        </html>
    `);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Listening to server connection
server.listen(PORT, () => console.log(`Server is connected on ${PORT}`));
