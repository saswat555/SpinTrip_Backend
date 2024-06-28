module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define("Transaction", {
    Transactionid: { type: DataTypes.STRING, primaryKey: true },
    Bookingid: { type: DataTypes.STRING(36) },
    Date: DataTypes.DATEONLY,  
    time: DataTypes.DATE,
    timestamp: DataTypes.DATE,
    id: {type: DataTypes.STRING(36)},
    status: { type: DataTypes.INTEGER,allowNull: true },
    amount: { type: DataTypes.FLOAT, allowNull: true },
    GSTAmount: { type: DataTypes.FLOAT, allowNull: true }, 
    totalAmount: { type: DataTypes.FLOAT, allowNull: true },
  });

  return Transaction;
};
