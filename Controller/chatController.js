const db = require('../Models');
const Chat = db.Chat;

// Send a message
exports.sendMessage = async (req, res) => {
    console.log("hello")
    console.log(req.body)
    const { bookingId, senderId, receiverId, message } = req.body;

    try {
        const newMessage = await Chat.create({ bookingId, senderId, receiverId, message });
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get chat messages by booking ID
exports.getMessagesByBookingId = async (req, res) => {
    const { bookingId } = req.params;

    try {
        const messages = await Chat.findAll({ where: { bookingId } });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all chat messages (Admin)
exports.getAllMessages = async (req, res) => {
    try {
        const messages = await Chat.findAll();
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Flag a message (Admin)
exports.flagMessage = async (req, res) => {
    const { messageId } = req.params;

    try {
        const message = await Chat.findByPk(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        message.flagged = true;
        await message.save();

        res.status(200).json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
