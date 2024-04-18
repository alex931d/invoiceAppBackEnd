"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const server_1 = require("../server");
const crypto_1 = require("crypto");
const sizeOf = require("image-size");
const accountAPI = express_1.default.Router();
const auth_1 = __importDefault(require("../middleware/auth"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
const schema_1 = require("../models/schema");
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage: storage });
dotenv_1.default.config();
const secretKey = process.env.SECRET_KEY;
accountAPI.post("/logout", auth_1.default, async (req, res) => {
    try {
        res
            .clearCookie("jwt")
            .status(200)
            .json({ message: "user successfully logged out" });
    }
    catch (error) {
        res.status(500).json({ error: "error trying to logout" });
    }
});
accountAPI.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await schema_1.User.findOne({ email: email });
        if (!user) {
            return res.status(401).json({ message: "cannot find user" });
        }
        const projects = await schema_1.Project.find({ _id: { $in: user.projects } })
            .populate({
            path: "invoices",
            populate: { path: "client" },
        })
            .exec();
        if (!projects) {
            return res.status(500).json({ error: "no projects found" });
        }
        if (!secretKey) {
            return res.status(500).json({ error: "error loading data try again" });
        }
        const passwordMatch = await bcrypt_1.default.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid username or password" });
        }
        const token = jsonwebtoken_1.default.sign({
            user: {
                _id: user._id,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                projects: projects,
            },
            projects: projects,
        }, secretKey, {
            expiresIn: "2h",
        });
        res
            .clearCookie("jwt")
            .cookie("jwt", token)
            .status(200)
            .json({
            message: "user successfully logged in",
            user: {
                _id: user._id,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                projects: projects,
            },
            projects: projects,
            token: token,
            expiresIn: "24h",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
accountAPI.post("/refresh", auth_1.default, (req, res) => {
    const { token } = req.body.authToken;
    if (!process.env.SECRET_KEY) {
        return res.status(403).json({ error: "Error loading data" });
    }
    jsonwebtoken_1.default.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: "Invalid refresh token" });
        }
        const decodedUser = decoded;
        const projects = await schema_1.Project.find({
            _id: { $in: decodedUser.user.projects },
        })
            .populate({
            path: "invoices",
            populate: { path: "client" },
        })
            .exec();
        if (!projects) {
            return res.status(500).json({ error: "no projects found" });
        }
        const newAccessToken = jsonwebtoken_1.default.sign({
            user: {
                _id: decodedUser.user._id,
                email: decodedUser.user.email,
                role: decodedUser.user.role,
                avatar: decodedUser.user.avatar,
                projects: projects,
            },
        }, process.env.SECRET_KEY || "", {
            expiresIn: "15m",
        });
        res.json({
            message: "user successfully logged in",
            token: newAccessToken,
            expiresIn: "12h",
        });
    });
});
accountAPI.put("/updateUser", upload.single("file"), async (req, res) => {
    const id = req.body.userId;
    const user = JSON.parse(req.body.user);
    const file = req.file;
    if (!user.email) {
        return res.status(400).json({ message: "No email found" });
    }
    if (!id) {
        return res.status(400).json({ message: "No user id found" });
    }
    const doesEmailExist = await schema_1.User.findOne({
        email: user.email,
        _id: { $ne: id },
    });
    if (doesEmailExist) {
        return res.status(400).json({ message: "email exists" });
    }
    try {
        if (file) {
            const dimensions = sizeOf(file.buffer);
            const isSizeValid = dimensions.width <= 1024 && dimensions.height <= 1024;
            if (!isSizeValid) {
                return res.status(400).json({ message: "Invalid image sizes" });
            }
            const randomFilename = (0, crypto_1.randomUUID)();
            const tempFilePath = path_1.default.join(os_1.default.tmpdir(), randomFilename);
            fs_1.default.writeFile(tempFilePath, file.buffer, (err) => {
                if (err) {
                    console.error("Error writing file to temporary location:", err);
                    return res
                        .status(500)
                        .json({ message: "Error processing file", error: err });
                }
                const readStream = fs_1.default.createReadStream(tempFilePath);
                const uploadStream = server_1.gridFSBucket.openUploadStream(randomFilename);
                readStream.pipe(uploadStream);
                uploadStream.on("error", (error) => {
                    console.error("Error writing file to GridFS:", error);
                    res
                        .status(500)
                        .json({ message: "Error writing file to GridFS", error });
                });
                uploadStream.on("finish", async () => {
                    const imageUrl = `${process.env.LOCAL_SERVER_API}/images/${randomFilename}`;
                    const image = new schema_1.ImageModel({
                        filename: randomFilename,
                        contentType: file.mimetype,
                        fileId: uploadStream.id,
                        url: imageUrl,
                    });
                    fs_1.default.unlink(tempFilePath, (unlinkError) => {
                        if (unlinkError) {
                            console.error("Error unlinking temporary file:", unlinkError);
                        }
                    });
                    await image.save();
                    console.log("uploaded");
                    const user = await schema_1.User.findById(id);
                    if (!user) {
                        return res.status(404).json({ message: "User not found" });
                    }
                    schema_1.User.findOneAndUpdate({ _id: id }, { email: user.email, avatar: imageUrl }, { new: true })
                        .then((updatedUser) => {
                        if (!updatedUser) {
                            return res
                                .status(404)
                                .json({ message: "User not found or updated" });
                        }
                        return res.status(200).json({
                            message: "User updated successfully",
                        });
                    })
                        .catch((error) => {
                        console.error("Error updating user in the database:", error);
                        return res.status(500).json({ error: "Internal server error" });
                    });
                });
            });
        }
        else {
            schema_1.User.findOneAndUpdate({ _id: id }, { email: user.email }, { new: true })
                .then((updatedUser) => {
                if (!updatedUser) {
                    return res
                        .status(404)
                        .json({ message: "User not found or updated" });
                }
                return res.status(200).json({
                    message: "User updated successfully",
                });
            })
                .catch((error) => {
                console.error("Error updating user in the database:", error);
                return res.status(500).json({ error: "Internal server error" });
            });
        }
    }
    catch (error) {
        console.error("Error processing request:", error);
        return res.status(400).json({ message: "Error processing request", error });
    }
});
accountAPI.post("/signup", async (req, res) => {
    const { email, password } = req.body;
    try {
        const existingUser = await schema_1.User.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }
        if (!secretKey) {
            return res.status(400).json({ message: "error loading data" });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const newUser = new schema_1.User({
            email: email,
            password: hashedPassword,
            role: "user",
            avatar: "deafult",
            projects: [],
        });
        const project = new schema_1.Project({
            name: "default project",
            description: "default discription",
            invoices: [],
            owner: newUser._id,
        });
        await project.save();
        newUser.projects.push(project._id);
        await newUser.save();
        const token = jsonwebtoken_1.default.sign({ user: newUser, projects: newUser.projects }, secretKey, {
            expiresIn: "2h",
        });
        res.clearCookie("jwt").cookie("jwt", token).status(200).json({
            message: "user successfully signed up",
            user: newUser,
            projects: newUser.projects,
            token: token,
            expiresIn: "24h",
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "An error occurred" });
    }
});
exports.default = accountAPI;
