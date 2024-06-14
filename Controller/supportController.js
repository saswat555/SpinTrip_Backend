const { Support, SupportChat } = require('../Models');
const uuid = require('uuid');

const createSupportTicket = async (req, res) => {
    console.log("reached here")
  try {
    const { subject, message } = req.body;
    console.log(message)
    const userId = req.user.id; // Assuming user ID is obtained from JWT or session
    console.log(userId)
    id = uuid.v4();
    const supportTicket = await Support.create({ id:id, userId:userId, subject:subject, message:message });
    await SupportChat.create({ id:id, supportId: supportTicket.id, senderId: userId, message: message });
    res.status(201).json(supportTicket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addSupportMessage = async (req, res) => {
  try {
    const id = uuid.v4();
    const { supportId, message } = req.body;
    const senderId = req.user.id; // Assuming user ID is obtained from JWT or session
    const supportMessage = await SupportChat.create({ id:id, supportId, senderId, message });
    res.status(201).json(supportMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const escalateSupportTicket = async (req, res) => {
  try {
    const { supportId } = req.body;
    const supportTicket = await Support.findByPk(supportId);
    if (!supportTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    supportTicket.priority += 1;
    supportTicket.status = 'escalated';
    await supportTicket.save();
    res.status(200).json(supportTicket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resolveSupportTicket = async (req, res) => {
  try {
    const { supportId } = req.body;
    const supportTicket = await Support.findByPk(supportId);
    if (!supportTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    supportTicket.status = 'resolved';
    await supportTicket.save();
    res.status(200).json(supportTicket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// View all support tickets
const viewSupportTickets = async (req, res) => {
    try {
      const tickets = await Support.findAll();
      res.status(200).json({ tickets });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  };
  
  // Reply to a support ticket
  const replyToSupportTicket = async (req, res) => {
    const { ticketId, reply } = req.body;
    try {
      const ticket = await SupportTicket.findByPk(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      await SupportReply.create({ ticketId, reply, adminId: req.user.id });
      ticket.status = 'Replied';
      await ticket.save();
      res.status(200).json({ message: 'Reply sent successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  };
  
module.exports = { createSupportTicket, viewSupportTickets,replyToSupportTicket,addSupportMessage, escalateSupportTicket, resolveSupportTicket };
