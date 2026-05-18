import db from "../database/db.js";
import { verifyToken } from "../utils/jwt.js";

const sessionLookup = db.prepare(
  "SELECT jti, expires_at, revoked FROM sessions WHERE jti = ? LIMIT 1"
);
const memberLookup = db.prepare("SELECT id, active FROM members WHERE id = ? LIMIT 1");

export const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing bearer token." });
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    const session = sessionLookup.get(payload.jti);
    if (!session || session.revoked) {
      return res.status(401).json({ message: "Session is invalid." });
    }
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return res.status(401).json({ message: "Session expired." });
    }
    if (payload.role === "team") {
      const member = memberLookup.get(payload.memberId);
      if (!member || !member.active) {
        return res.status(403).json({ message: "Member access revoked." });
      }
    }
    req.user = payload;
    req.token = token;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token." });
  }
};
