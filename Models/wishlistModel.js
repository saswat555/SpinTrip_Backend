module.exports = (sequelize, DataTypes) => {
  const Wishlist = sequelize.define("Wishlist", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userid: {type: DataTypes.STRING(36)},
    carid: { type: DataTypes.STRING(36)},
  });

  return Wishlist;
};
