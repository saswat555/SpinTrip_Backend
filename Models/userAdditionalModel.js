module.exports = (sequelize, DataTypes) => {
    const UserAdditional = sequelize.define("UserAdditional", {
      id: { type: DataTypes.STRING(36), primaryKey: true },
      Dlverification: DataTypes.INTEGER,
      FullName: DataTypes.STRING(100),
      AadharVfid: DataTypes.INTEGER,
      Address: DataTypes.TEXT,
      verification_status: DataTypes.INTEGER,
      CurrentAddressVfid: { type: DataTypes.INTEGER, unique: true },
      ml_data: DataTypes.BLOB,
      dl: DataTypes.STRING,
      aadhar: DataTypes.STRING

    });
 
  
    return UserAdditional;
  };
  