module.exports = (sequelize, DataTypes) => {
  const Device = sequelize.define("Device", {
    deviceid: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    lat: DataTypes.STRING,
    lng: DataTypes.STRING,
    speed: DataTypes.STRING,
    date:  DataTypes.STRING,
    time: DataTypes.STRING,
  });
  return Device;
};
