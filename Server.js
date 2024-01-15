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

// Setting up your port
const PORT = process.env.PORT || 2000;

// Assigning the variable app to express
const app = express();

// Middleware
app.use(cors({ origin: ['http://spintrip.in', 'http://106.51.16.163:3000', 'http://localhost:3001'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

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
// Listening to server connection
app.listen(PORT, () => console.log(`Server is connected on ${PORT}`));
