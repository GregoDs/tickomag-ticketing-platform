const { admin, db } = require("../services/firebase.service");

async function requireAdmin(req, res, next) {
  const authorization = req.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({
      success: false,
      message: "Administrator authentication is required",
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(match[1]);
    const adminDoc = await db.collection("admins").doc(decodedToken.uid).get();
    const profile = adminDoc.data();

    if (!adminDoc.exists || profile?.role !== "admin" || profile.active === false) {
      return res.status(403).json({
        success: false,
        message: "This account cannot scan tickets",
      });
    }

    req.adminUser = {
      uid: decodedToken.uid,
      email: decodedToken.email || profile.email || "",
      name: profile.name || profile.displayName || decodedToken.name || "",
    };

    return next();
  } catch (error) {
    console.error("Admin authentication failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Your administrator session is invalid or expired",
    });
  }
}

module.exports = { requireAdmin };
