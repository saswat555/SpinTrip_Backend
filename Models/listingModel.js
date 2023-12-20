module.exports = (sequelize, DataTypes) => {
  const Listing = sequelize.define("Listing", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    carid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    hostid: {
      type: DataTypes.INTEGER,
    },
    details: {
      type: DataTypes.STRING,
    },
    start_date: {
      type: DataTypes.DATEONLY, // Use DATEONLY for date without time
      allowNull: true, // Allow null values for optional dates
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: true, // Allow null values for optional times
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    pausetime_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    pausetime_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    pausetime_start_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    pausetime_end_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    listingid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true, // Ensure it's an integer
        min: 0, // Ensure it's non-negative
      },
    },
    hourcount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true, // Ensure it's an integer
        min: 0, // Ensure it's non-negative
      },
    },
    bookingId : {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  });

  // Define associations here, if needed

  return Listing;
};
