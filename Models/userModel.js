
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    phone: { type: DataTypes.STRING(100), unique: true },
    password: DataTypes.STRING(100),
    FullName: DataTypes.STRING(100),
    AadharVfid: { type: DataTypes.INTEGER, unique: true },
    Address: DataTypes.TEXT,
    CurrentAddressVfid: { type: DataTypes.INTEGER, unique: true },
    ml_data: DataTypes.BLOB,
    role: DataTypes.STRING(50),
    pausetime: DataTypes.DATE,
    otp:DataTypes.STRING(100),
    timestamp: DataTypes.DATE,
    status:DataTypes.INTEGER
  });

  return User;
};
