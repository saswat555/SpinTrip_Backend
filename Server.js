const express = require('express');
const dotenv = require('dotenv').config();
const cookieParser = require('cookie-parser');
const db = require('./Models/index.js'); // Update the import path for models
const userRoute = require('./Routes/userRoutes.js')
//  etting up your port
const PORT = process.env.PORT || 2000;
const userRoutes = require('./Routes/userRoutes');
const hostRoutes = require('./Routes/hostRoutes');
const adminRoutes = require('./Routes/adminRoutes');
// Assigning the variable app to express
const app = express();
const path = require('path');
const cors = require('cors');
// Middleware
app.use(cors());
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/user', userRoutes);
// Synchronizing the database and forcing it to false so we don't lose data
db.sequelize.sync().then(() => {
  console.log('Database is connected');
});

// Routes for the user API
app.use('/api/users', userRoute);
app.use('/api/admin', adminRoutes);
app.use('/api/host', hostRoutes);
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
