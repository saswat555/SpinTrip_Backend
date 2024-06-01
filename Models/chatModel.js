const { Sequelize, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

const Chat = sequelize.define('Chat', {
    bookingId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    senderId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    receiverId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
    },
    flagged: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    }
});
return Chat;
}

