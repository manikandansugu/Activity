const jwt = require("jsonwebtoken");
const { promisify } = require("util");

// Protect routes with JWT
exports.protect = async (req, res, next) => {
  try {
    // 1) Check if token exists
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "You are not logged in! Please log in to get access.",
      });
    }

    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists (optional)
    // const currentUser = await User.findById(decoded.id);
    // if (!currentUser) {
    //   return res.status(401).json({
    //     status: 'fail',
    //     message: 'The user belonging to this token no longer exists.',
    //   });
    // }

    // 4) Grant access & attach user data to request
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      status: "fail",
      message: "Invalid or expired token!",
    });
  }
};

// Role-based access control (optional)
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };
};
