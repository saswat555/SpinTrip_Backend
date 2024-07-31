const { Sequelize, DataTypes } = require('sequelize');
const { Worker } = require('worker_threads');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_PORT = process.env.DB_PORT;
const DB_NAME = process.env.DB_NAME;

const sequelize = new Sequelize(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`, {
  dialect: 'postgres',
  pool: {
    max: 200,
    min: 5,
    acquire: 30000,
    idle: 10000
  }
});

sequelize.authenticate()
  .then(() => {
    console.log('Database connected successfully');
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
db.Wishlist = require('./wishlistModel')(sequelize, DataTypes);
db.Transaction = require('./TransactionModel')(sequelize, DataTypes);
db.Blog = require('./blogModel')(sequelize, DataTypes);
db.BlogComment = require('./blogCommentModel')(sequelize, DataTypes);
db.Device = require('./deviceModel')(sequelize, DataTypes);
db.Feature = require('./featureModel')(sequelize, DataTypes);
db.carFeature = require('./carFeaturesModel')(sequelize, DataTypes);
const associateModels = () => {
  const { User, Admin, Car, Host, UserAdditional, Booking, Listing, CarAdditional, 
    Feedback, Support, SupportChat, Tax, Wishlist, Device, Feature, carFeature, Blog, BlogComment  } = sequelize.models;

  Support.belongsTo(User, { foreignKey: 'userId' });
  SupportChat.belongsTo(Support, { foreignKey: 'supportId' });
  SupportChat.belongsTo(User, { foreignKey: 'userId' });
  SupportChat.belongsTo(Admin, { foreignKey: 'adminId' });
  carFeature.belongsTo(Feature, { foreignKey: 'featureid' });
  carFeature.belongsTo(Car, { foreignKey: 'carid' });
  BlogComment.belongsTo(Blog, {foreignKey: 'blogId'});
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
  Booking.belongsTo(UserAdditional, { foreignKey: 'id' });
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

module.exports = db;
