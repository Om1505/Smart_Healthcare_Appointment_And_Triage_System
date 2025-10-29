const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from the Authorization header (e.g., "Bearer <token>")
  const token = req.header('Authorization')?.split(' ')[1];

  // Check if no token is found
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Verify the token
  try {
    // Decode the token using your JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach the user's info (from the token) to the request object
    req.user = decoded;
    
    // --- KEY ADMIN CHECK ---
    // Check if the userType is 'admin'
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    
    // If user is an admin, proceed to the route
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};