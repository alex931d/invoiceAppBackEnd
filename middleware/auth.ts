import { Request, Response, NextFunction } from "express";
import { IUser, User } from "../models/schema";
import jwt, { VerifyErrors, VerifyOptions } from "jsonwebtoken";

const secretKey = "1a3f7d9e2c5h8k0o3w6s9v2b4x7z1q3u5t8m0l2n";

function verifyToken(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  jwt.verify(token, secretKey, (err: VerifyErrors | null, decoded: unknown) => {
    if (err) {
      return res
        .clearCookie("jwt")
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const decodedUser = decoded as { user: IUser };
    req.user = decodedUser.user;
    next();
  });
}

export default verifyToken;
