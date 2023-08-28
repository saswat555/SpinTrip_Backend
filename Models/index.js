const { Sequelize, DataTypes } = require('sequelize');

// Database connection with the dialect of PostgreSQL specifying the database we are using
// Port for my database is 5432
// Database name is database_development
const sequelize = new Sequelize(`postgres://postgres:1234@localhost:5432/database_development`, {
  dialect: 'postgres',
});


// Checking if connection is established
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connected to database_development');
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  });

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./userModel')(sequelize, DataTypes);
db.Admin = require('./adminModel')(sequelize, DataTypes);
db.Car = require('./carModel')(sequelize, DataTypes);
db.Host = require('./hostModel')(sequelize, DataTypes);
db.UserAdditional = require('./userAdditionalModel')(sequelize, DataTypes);
db.Booking = require('./bookingModel')(sequelize, DataTypes);

// Set up associations
const associateModels = () => {
  const { User, Admin, Car, Host, UserAdditional, Booking } = sequelize.models;

  
  Host.belongsTo(User, { foreignKey: 'id' });
  Admin.belongsTo(User, { foreignKey: 'id'});
  Car.belongsTo(Host, {foreignKey: 'carid'});
  UserAdditional.belongsTo(User, {foreignKey: 'id'})
  Booking.hasOne(User);
  Booking.hasOne(Car);
  User.hasOne(Admin);
  User.hasOne(Host);
  User.hasMany(Booking);

 // Assuming Car model is imported and defined
};
associateModels();
// Exporting the module
module.exports = db;