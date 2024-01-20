module.exports = (sequelize, DataTypes) => {
  const Admin = sequelize.define("Admin", {
    id: { type: DataTypes.STRING(36), primaryKey: true },
    SecurityQuestion: DataTypes.STRING(50),
    timestamp: DataTypes.DATE,
  });


  return Admin;
};
