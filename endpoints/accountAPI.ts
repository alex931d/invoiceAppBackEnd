import express, { Router } from "express";
import { gridFSBucket } from "../server";
import { randomUUID } from "crypto";
const sizeOf = require("image-size");
const accountAPI: Router = express.Router();
import mongoose from "mongoose";
import verifyToken from "../middleware/auth";
import jwt from "jsonwebtoken";
import path from "path";
import multer from "multer";
import fs from "fs";
import os from "os";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import {
  User,
  Project,
  Client,
  IUser,
  IInvoice,
  Status,
  Filter,
  PaymentTerms,
  IItem,
  IClient,
  IProject,
  ImageModel,
} from "../models/schema";
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
dotenv.config();
const secretKey: string | undefined = process.env.SECRET_KEY;
accountAPI.post("/logout", verifyToken, async (req, res) => {
  try {
    res
      .clearCookie("jwt")
      .status(200)
      .json({ message: "user successfully logged out" });
  } catch (error) {
    res.status(500).json({ error: "error trying to logout" });
  }
});
accountAPI.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(401).json({ message: "cannot find user" });
    }
    const projects = await Project.find({ _id: { $in: user.projects } })
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
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      {
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          projects: projects,
        },
        projects: projects,
      },
      secretKey,
      {
        expiresIn: "2h",
      }
    );

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

accountAPI.post("/refresh", verifyToken, (req, res) => {
  const { token } = req.body.authToken;

  if (!process.env.SECRET_KEY) {
    return res.status(403).json({ error: "Error loading data" });
  }

  jwt.verify(
    token,
    process.env.SECRET_KEY,
    async (err: jwt.VerifyErrors | null, decoded: unknown) => {
      if (err) {
        return res.status(403).json({ error: "Invalid refresh token" });
      }
      const decodedUser = decoded as { user: IUser };
      const projects = await Project.find({
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
      const newAccessToken = jwt.sign(
        {
          user: {
            _id: decodedUser.user._id,
            email: decodedUser.user.email,
            role: decodedUser.user.role,
            avatar: decodedUser.user.avatar,
            projects: projects,
          },
        },
        process.env.SECRET_KEY || "",
        {
          expiresIn: "15m",
        }
      );
      res.json({
        message: "user successfully logged in",
        token: newAccessToken,
        expiresIn: "12h",
      });
    }
  );
});

accountAPI.put("/updateUser", upload.single("file"), async (req, res) => {
  const id: string = req.body.userId;
  const user: IUser = JSON.parse(req.body.user) as IUser;
  const file: Express.Multer.File | undefined = req.file;

  if (!user.email) {
    return res.status(400).json({ message: "No email found" });
  }
  if (!id) {
    return res.status(400).json({ message: "No user id found" });
  }
  const doesEmailExist = await User.findOne({
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

      const randomFilename = randomUUID();
      const tempFilePath = path.join(os.tmpdir(), randomFilename);

      fs.writeFile(tempFilePath, file.buffer, (err) => {
        if (err) {
          console.error("Error writing file to temporary location:", err);
          return res
            .status(500)
            .json({ message: "Error processing file", error: err });
        }
        const readStream = fs.createReadStream(tempFilePath);
        const uploadStream = gridFSBucket.openUploadStream(randomFilename);
        readStream.pipe(uploadStream);
        uploadStream.on("error", (error) => {
          console.error("Error writing file to GridFS:", error);
          res
            .status(500)
            .json({ message: "Error writing file to GridFS", error });
        });

        uploadStream.on("finish", async () => {
          const imageUrl = `${process.env.LOCAL_SERVER_API}/images/${randomFilename}`;
          const image = new ImageModel({
            filename: randomFilename,
            contentType: file.mimetype,
            fileId: uploadStream.id,
            url: imageUrl,
          });
          fs.unlink(tempFilePath, (unlinkError) => {
            if (unlinkError) {
              console.error("Error unlinking temporary file:", unlinkError);
            }
          });
          await image.save();
          console.log("uploaded");
          const user = await User.findById(id);
          if (!user) {
            return res.status(404).json({ message: "User not found" });
          }

          User.findOneAndUpdate(
            { _id: id },
            { email: user.email, avatar: imageUrl },
            { new: true }
          )
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
            .catch((error: Error) => {
              console.error("Error updating user in the database:", error);
              return res.status(500).json({ error: "Internal server error" });
            });
        });
      });
    } else {
      User.findOneAndUpdate({ _id: id }, { email: user.email }, { new: true })
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
        .catch((error: Error) => {
          console.error("Error updating user in the database:", error);
          return res.status(500).json({ error: "Internal server error" });
        });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(400).json({ message: "Error processing request", error });
  }
});
accountAPI.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }
    if (!secretKey) {
      return res.status(400).json({ message: "error loading data" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email: email,
      password: hashedPassword,
      role: "user",
      avatar: "deafult",
      projects: [],
    });

    const project = new Project({
      name: "default project",
      description: "default discription",
      invoices: [],
      owner: newUser._id,
    });
    await project.save();

    newUser.projects.push(project._id);
    await newUser.save();
    const token = jwt.sign(
      { user: newUser, projects: newUser.projects },
      secretKey,
      {
        expiresIn: "2h",
      }
    );

    res.clearCookie("jwt").cookie("jwt", token).status(200).json({
      message: "user successfully signed up",
      user: newUser,
      projects: newUser.projects,
      token: token,
      expiresIn: "24h",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred" });
  }
});
export default accountAPI;
