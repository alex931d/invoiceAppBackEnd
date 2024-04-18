"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const secretKey = "1a3f7d9e2c5h8k0o3w6s9v2b4x7z1q3u5t8m0l2n";
function verifyToken(req, res, next) {
    const token = req.cookies.jwt;
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    jsonwebtoken_1.default.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res
                .clearCookie("jwt")
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }
        const decodedUser = decoded;
        req.user = decodedUser.user;
        next();
    });
}
exports.default = verifyToken;
