module.exports = (sequelize, DataTypes) => {
    const UserAdditional = sequelize.define("UserAdditional", {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      Dlverifiaction: DataTypes.INTEGER,
      timestamp: DataTypes.DATE,
      FullName: DataTypes.STRING(100),
      AadharVfid: { type: DataTypes.INTEGER, unique: true },
      Address: DataTypes.TEXT,
      CurrentAddressVfid: { type: DataTypes.INTEGER, unique: true },
      ml_data: DataTypes.BLOB,

    });
 
  
    return UserAdditional;
  };
  