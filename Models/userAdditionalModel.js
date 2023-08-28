module.exports = (sequelize, DataTypes) => {
    const UserAdditional = sequelize.define("UserAdditional", {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      Dlverifiaction: DataTypes.INTEGER,
      timestamp: DataTypes.DATE,
    });
 
  
    return UserAdditional;
  };
  