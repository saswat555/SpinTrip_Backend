  const { Sequelize, DataTypes } = require('sequelize');

  // Database connection with the dialect of PostgreSQL specifying the database we are using
  // Port for my database is 5432
  // Database name is database_development
  const sequelize = new Sequelize(`postgres://postgres:mysecretpassword@172.17.0.5:5432/database_development`, {
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
  db.Host = require('./hostModel')(sequelize, DataTypes);
  db.Car = require('./carModel')(sequelize, DataTypes);
  db.UserAdditional = require('./userAdditionalModel')(sequelize, DataTypes);
  db.CarAdditional = require('./carAdditionalModel')(sequelize, DataTypes);
  db.Booking = require('./bookingModel')(sequelize, DataTypes);
  db.Brand = require('./brandModel')(sequelize, DataTypes);
  db.Listing = require('./listingModel')(sequelize, DataTypes);
  db.Pricing = require('./pricingModel')(sequelize, DataTypes);
  // Set up associations
  const associateModels = () => {
    const { User, Admin, Car, Host, UserAdditional, Booking, Listing, CarAdditional } = sequelize.models;

    
    Host.belongsTo(User, { foreignKey: 'id' });
    Admin.belongsTo(User, { foreignKey: 'id'});
    UserAdditional.belongsTo(User, {foreignKey: 'id'});
    CarAdditional.belongsTo(Car, {foreignKey: 'carid'});
    Car.belongsTo(Host, { foreignKey: 'carid'});
    Booking.hasOne(User);
    Booking.hasOne(Car);
    Booking.belongsTo(User, {foreignKey: 'id'});
    Booking.belongsTo(Car, { foreignKey: 'carid' });
    User.hasOne(Admin);
    User.hasOne(Host);
    User.hasMany(Booking);
    Listing.hasOne(Car, {foreignKey: 'carid' });
    Listing.hasOne(Host, {foreignKey: 'id', sourcekey: 'hostid'})
    Host.hasMany(Car, {foreignKey: 'carhostid',sourceKey: 'id'})
  // Assuming Car model is imported and defined
  };
  associateModels();
  // Exporting the module
  module.exports = db;