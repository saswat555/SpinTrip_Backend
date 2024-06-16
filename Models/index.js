const { Sequelize, DataTypes } = require('sequelize');

// Database connection with the dialect of PostgreSQL specifying the database we are using
// Port for my database is 5432
// Database name is database_development
require('dotenv').config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_PORT = process.env.DB_PORT;
const DB_NAME = process.env.DB_NAME;

const sequelize = new Sequelize(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`, {
  dialect: 'postgres',
});



// Checking if connection is established
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connected to database successfully');
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  });

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./userModel')(sequelize, DataTypes);
db.Admin = require('./adminModel')(sequelize, DataTypes);
db.Host = require('./hostModel')(sequelize, DataTypes);
db.Car = require('./carModel')(sequelize, DataTypes);
db.UserAdditional = require('./userAdditionalModel')(sequelize, DataTypes);
db.CarAdditional = require('./carAdditionalModel')(sequelize, DataTypes);
db.Booking = require('./bookingModel')(sequelize, DataTypes);
db.Brand = require('./brandModel')(sequelize, DataTypes);
db.Listing = require('./listingModel')(sequelize, DataTypes);
db.Pricing = require('./pricingModel')(sequelize, DataTypes);
db.Feedback = require('./feedback')(sequelize, DataTypes);
db.Chat = require('./chatModel')(sequelize, DataTypes);
db.Tax = require('./TaxModel')(sequelize, DataTypes);
db.Support = require('./supportModel')(sequelize, DataTypes);
db.SupportChat = require('./supportChatModel')(sequelize, DataTypes);
const associateModels = () => {
  const { User, Admin, Car, Host, UserAdditional, Booking, Listing, CarAdditional, Feedback, Support, SupportChat } = sequelize.models;
  
  Support.belongsTo(User, { foreignKey: 'userId' });
  SupportChat.belongsTo(Support, { foreignKey: 'supportId' });
  SupportChat.belongsTo(User, { foreignKey: 'userId' });
  SupportChat.belongsTo(Admin, { foreignKey: 'adminId' });
  
  User.hasMany(Support, { foreignKey: 'userId' });
  Support.hasMany(SupportChat, { foreignKey: 'supportId' });
  User.hasMany(SupportChat, { foreignKey: 'userId' });
  Admin.hasMany(SupportChat, { foreignKey: 'adminId' });
  
  Host.belongsTo(User, { foreignKey: 'id' });
  Admin.belongsTo(User, { foreignKey: 'id' });
  UserAdditional.belongsTo(User, { foreignKey: 'id' });
  CarAdditional.belongsTo(Car, { foreignKey: 'carid' });
  Car.belongsTo(Host, { foreignKey: 'carid' });
  Booking.hasOne(User);
  Booking.hasOne(Car);
  Booking.belongsTo(User, { foreignKey: 'id' });
  Booking.belongsTo(Car, { foreignKey: 'carid' });
  User.hasOne(Admin);
  User.hasOne(Host);
  User.hasMany(Booking);
  Listing.hasOne(Car, { foreignKey: 'carid' });
  Listing.hasOne(Host, { foreignKey: 'id', sourcekey: 'hostid' });
  Host.hasMany(Car, { foreignKey: 'carhostid', sourceKey: 'id' });
  Car.hasMany(Feedback, { foreignKey: 'carId' });
  Feedback.belongsTo(Car, { foreignKey: 'carId' });
};

associateModels();

// Exporting the module
module.exports = db;
associateModels();
// Exporting the module
module.exports = db;