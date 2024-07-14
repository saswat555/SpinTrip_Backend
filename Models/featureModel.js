module.exports = (sequelize, DataTypes) => {
    const Feature= sequelize.define("Feature", {
      id: { type: DataTypes.UUID, primaryKey: true },
      featureName: DataTypes.STRING,
    });
    return Feature;
  };
  