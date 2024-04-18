import express, { Router } from "express";
const invoiceAPI: Router = express.Router();
import mongoose from "mongoose";
import verifyToken from "../middleware/auth";
import jwt from "jsonwebtoken";
import path from "path";
import multer from "multer";
import fs from "fs";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
invoiceAPI.use(express.json());
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
} from "../models/schema";

dotenv.config();
const secretKey: string | undefined = process.env.SECRET_KEY;
invoiceAPI.put("/updateInvoice", verifyToken, async (req, res) => {
  const {
    projectId,
    invoiceUUID,
    invoice,
  }: { projectId: number | string; invoiceUUID: string; invoice: IInvoice } =
    req.body;
  if (!projectId || !invoiceUUID || !invoice) {
    return res
      .status(404)
      .json({ error: "projectid or invoiceUUID or invoice not found" });
  }
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    const index = project.invoices.findIndex(
      (invoice) => invoice.uuid === invoiceUUID
    );
    if (index === -1) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    const clientIdToUpdate = project.invoices[index].client;

    await Client.updateOne({ _id: clientIdToUpdate }, { $set: invoice.client });

    project.invoices[index] = {
      uuid: invoice.uuid,
      address: invoice.address,
      city: invoice.city,
      postCode: invoice.postCode,
      country: invoice.country,
      client: clientIdToUpdate,
      date: invoice.date,
      paymentTerms: invoice.paymentTerms,
      description: invoice.description,
      itemList: invoice.itemList,
      status: invoice.status,
      amount: invoice.amount,
    } as IInvoice;

    await project.save();
    return res.status(200).json({ message: "Invoice updated successfully" });
  } catch (error) {
    return res.status(500).json({ error: error });
  }
});
invoiceAPI.delete("/deleteInvoice", verifyToken, async (req, res) => {
  const projectId = req.body.projectId;
  const invoiceUUID = req.body.uuid;
  if (!projectId || !invoiceUUID) {
    return res
      .status(404)
      .json({ error: "projectid or invoiceUUID not found" });
  }
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const index = project.invoices.findIndex(
      (invoice) => invoice.uuid === invoiceUUID
    );

    if (index === -1) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    project.invoices.splice(index, 1);

    await project.save();

    return res.status(200).json({ message: "Invoice deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});
invoiceAPI.post("/createInvoice", verifyToken, async (req, res) => {
  const {
    projectId,
    invoice,
  }: { projectId: number | string; invoice: IInvoice } = req.body;
  if (!invoice.client) {
    return res
      .status(400)
      .json({ error: "Client data is missing in the invoice" });
  }

  try {
    const createdClient = await Client.create(invoice.client);
    const clientId = createdClient._id;
    invoice.client = clientId;
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId },
      { $push: { invoices: invoice } },
      { new: true }
    );
    if (!updatedProject) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.status(200).json({
      message: "Invoice created successfully",
      project: updatedProject,
    });
  } catch (error) {
    res.status(500).json({ error });
    console.log(error);
  }
});
export default invoiceAPI;
