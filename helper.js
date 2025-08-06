const jwt = require("jsonwebtoken");
// Helper function to create JWT
function generateToken(user) {
  return jwt.sign(
    { id: user._id, username: user.email },
    process.env.JWT_SECRET
  );
}

module.exports = { generateToken };
