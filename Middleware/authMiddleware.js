const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User, Host, Admin } = require('../Models'); // Adjust the path if needed

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, 'your_secret_key');
};

const authenticate = async (req, res, next) => {
  if(req.header('token'))
  {
    token = req.header('token');
    const decodedToken = jwt.verify(token, 'your_secret_key');
    let user = await User.findOne({ where: { id:decodedToken.id } });
    req.user = { ...user.dataValues, userid:user.id };
    console.log("user is logged in")
    next();
  }
  else {
  const { phone, password } = req.body;

  try {
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid phone or password' });
    }

    const isPasswordValid = await bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid phone or password' });
    }

    const host = await Host.findOne({ where: { id: user.id } });
    const admin = await Admin.findOne({ where: { id: user.id } });

    let role = 'user';
    if (host) {
      role = 'host';
    } else if (admin) {
      role = 'admin';
    }
    const u = await User.findOne({where: {phone}});
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
}
};
const signup = async (req, res) => {
    const { phone, password, role } = req.body;
  
    try {
      // Input validation
      if (!phone || !password || !role) {
        return res.status(400).json({ message: 'phone, password, and role are required' });
      }
  
      // Check for existing user with the same phone
      const existingUser = await User.findOne({ where: { phone } });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this phone already exists' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      let user;
  
      switch (role) {
        case 'user':
          user = await User.create({
            phone,
            password: hashedPassword,
            // Add other user properties here
          });
          break;
        case 'host':
          user = await Host.create({
            phone,
            password: hashedPassword,
            // Add other host properties here
          });
          break;
        case 'admin':
          user = await Admin.create({
            phone,
            password: hashedPassword,
            // Add other admin properties here
          });
          break;
        default:
          return res.status(400).json({ message: 'Invalid role' });
      }
  
      const token = generateToken(user);
  
      res.status(201).json({ message: 'User created', user, token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error creating user' });
    }
  };
  
module.exports = {
  authenticate,
  signup,
  generateToken
};
