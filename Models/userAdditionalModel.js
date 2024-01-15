module.exports = (sequelize, DataTypes) => {
    const UserAdditional = sequelize.define("UserAdditional", {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      Dlverification: DataTypes.INTEGER,
      FullName: DataTypes.STRING(100),
      AadharVfid: DataTypes.INTEGER,
      Address: DataTypes.TEXT,
      CurrentAddressVfid: { type: DataTypes.INTEGER, unique: true },
      ml_data: DataTypes.BLOB,
      dl: DataTypes.STRING,
      aadhar: DataTypes.STRING

    });
 
  
    return UserAdditional;
  };
  