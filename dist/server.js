"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gridFSBucket = void 0;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const accountAPI_1 = __importDefault(require("./endpoints/accountAPI"));
const mongoose_1 = __importDefault(require("mongoose"));
const invoiceAPI_1 = __importDefault(require("./endpoints/invoiceAPI"));
const mongodb_1 = require("mongodb");
const auth_1 = __importDefault(require("./middleware/auth"));
const schema_1 = require("./models/schema");
dotenv_1.default.config();
const MongoDBURL = process.env.MONGODB_CONNECT;
const secretKey = process.env.SECRET_KEY;
let gridFSBucket;
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4173",
    ],
    credentials: true,
}));
app.use((0, helmet_1.default)());
app.use(helmet_1.default.contentSecurityPolicy({
    directives: {
        defaultSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:4173",
        ],
        scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:4173",
        ],
        styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:4173",
        ],
        imgSrc: [
            "'self'",
            "data:",
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:4173",
            "blob:",
        ],
    },
}));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(express_1.default.urlencoded({ limit: "10mb", extended: true }));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.static(path_1.default.join(__dirname)));
app.use(express_1.default.static(path_1.default.join(__dirname, "..", "frontend", "dist")));
if (MongoDBURL) {
    mongoose_1.default
        .connect(MongoDBURL)
        .then(() => {
        console.log("MongoDB connected successfully");
        exports.gridFSBucket = gridFSBucket = new mongodb_1.GridFSBucket(mongoose_1.default.connection.db);
    })
        .catch((error) => {
        console.error("Error connecting to MongoDB:", error);
    });
}
else {
    console.log(`error connecting to mongoDB`);
}
app.use((req, res, next) => {
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    next();
});
app.get("*", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "..", "frontend", "dist", "index.html"));
});
app.get("/protected", auth_1.default, (req, res) => {
    res.json({ success: true, message: "You have access to protected data" });
});
app.post("/images/:filename", async (req, res) => {
    try {
        const { filename } = req.params;
        const image = await schema_1.ImageModel.findOne({ filename });
        if (!image) {
            return res.status(404).json({ message: "Image not found" });
        }
        const files = await gridFSBucket.find({ filename }).toArray();
        if (!files[0] || files.length === 0) {
            return res.status(404).json({ message: "No files available" });
        }
        res.set("Content-Type", image.contentType);
        gridFSBucket.openDownloadStreamByName(filename).pipe(res);
    }
    catch (error) {
        console.error("Error serving image:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
app.post("/getData", auth_1.default, async (req, res) => {
    try {
        let user = req.user;
        const token = req.cookies.jwt;
        if (!secretKey) {
            return res.status(401).json({ message: "error" });
        }
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!user) {
            return res.status(401).json({ message: "error" });
        }
        const projects = await schema_1.Project.find({ _id: { $in: user.projects } })
            .populate({
            path: "invoices",
            populate: { path: "client" },
        })
            .exec();
        res.status(200).json({
            message: "user successfully sendt",
            user: {
                _id: user._id,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                projects: projects,
            },
            projects: projects,
        });
    }
    catch (error) {
        res.status(500).json({ error: "failled to send profile" });
    }
});
const db = mongoose_1.default.connection;
db.on("error", (error) => {
    console.log(error);
});
db.once("open", () => {
    console.log("db conntected");
});
app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});
const PORT = 3000;
app.use("/accountAPI", accountAPI_1.default);
app.use("/invoiceAPI", invoiceAPI_1.default);
app.listen(PORT, () => {
    console.log(`Server is running on PORT: ${PORT}`);
});
