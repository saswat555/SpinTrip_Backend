export default (sequelize, DataTypes) => {
  const Admin = sequelize.define("Admin", {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    SecurityQuestion: DataTypes.STRING(50),
    timestamp: DataTypes.DATE,
  });


  return Admin;
};
