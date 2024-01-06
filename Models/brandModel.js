module.exports = (sequelize, DataTypes) => {
    const Brand = sequelize.define("Brand", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      type: { type: DataTypes.STRING },
      brand: { type: DataTypes.STRING },
      carmodel: { type: DataTypes.STRING },
      brand_value: { type: DataTypes.INTEGER },
      base_price: { type: DataTypes.INTEGER, default: '100' },

    });
  
  
    return Brand;
  };