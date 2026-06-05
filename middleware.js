const jwt = require('jsonwebtoken');

function authMiddelware(req, res, next){
  const token = req.headers.token;
  if(!token){
    res.status(401).json({
      message: "Token missing"
    });
    return;
  }
  try{
    const decoded = jwt.verify(token, "secret1234");
    req.userId = decoded.userId;
    next();
  } catch(err){
    res.status(401).json({
      message: "Invalid token"
    });
  }
}

module.exports = authMiddelware;