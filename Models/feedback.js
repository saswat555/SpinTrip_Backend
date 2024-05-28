module.exports = (sequelize, DataTypes) => {
  const Feedback = sequelize.define("Feedback", {
    feedbackId: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    carId: {
      type: DataTypes.STRING(36),
      references: {
        model: 'Cars',
        key: 'carid'
      },
      allowNull: false
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false
    },
    userName: {
      type: DataTypes.STRING(40),
    },
    hostId: {
      type: DataTypes.STRING(36),
      allowNull: false
    },
    rating: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    }
  });

  return Feedback;
};
