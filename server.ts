import express, { Express, Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";

import multer from "multer";
import helmet from "helmet";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";

import jwt, { VerifyErrors, VerifyOptions } from "jsonwebtoken";
import accountAPI from "./endpoints/accountAPI";
import { MongoClient } from "mongodb";
import mongoose, { set } from "mongoose";
import invoiceAPI from "./endpoints/invoiceAPI";
import { GridFSBucket } from "mongodb";
import verifyToken from "./middleware/auth";

import { IUser, ImageModel, Project } from "./models/schema";
dotenv.config();
const MongoDBURL: string | undefined = process.env.MONGODB_CONNECT;
const secretKey: string | undefined = process.env.SECRET_KEY;
let gridFSBucket: GridFSBucket;
const app: Express = express();

app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:4173",
    ],
    credentials: true,
  })
);
app.use(helmet());

app.use(
  helmet.contentSecurityPolicy({
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
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname)));

app.use(express.static(path.join(__dirname, "..", "frontend", "dist")));
if (MongoDBURL) {
  mongoose
    .connect(MongoDBURL)
    .then(() => {
      console.log("MongoDB connected successfully");
      gridFSBucket = new GridFSBucket(mongoose.connection.db);
    })
    .catch((error) => {
      console.error("Error connecting to MongoDB:", error);
    });
} else {
  console.log(`error connecting to mongoDB`);
}
app.use((req, res, next) => {
  res.set("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});
app.get("*", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "dist", "index.html"));
});
app.get("/protected", verifyToken, (req, res) => {
  res.json({ success: true, message: "You have access to protected data" });
});
app.post("/images/:filename", async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const image = await ImageModel.findOne({ filename });
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    const files = await gridFSBucket.find({ filename }).toArray();
    if (!files[0] || files.length === 0) {
      return res.status(404).json({ message: "No files available" });
    }
    res.set("Content-Type", image.contentType);
    gridFSBucket.openDownloadStreamByName(filename).pipe(res);
  } catch (error: any) {
    console.error("Error serving image:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.post("/getData", verifyToken, async (req, res) => {
  try {
    let user: IUser | undefined = req.user;
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

    const projects = await Project.find({ _id: { $in: user.projects } })
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
  } catch (error) {
    res.status(500).json({ error: "failled to send profile" });
  }
});
const db = mongoose.connection;
db.on("error", (error: any) => {
  console.log(error);
});
db.once("open", () => {
  console.log("db conntected");
});
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
const PORT: string | number = 3000;
app.use("/accountAPI", accountAPI);
app.use("/invoiceAPI", invoiceAPI);
app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
export { gridFSBucket };
