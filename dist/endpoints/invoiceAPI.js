"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const invoiceAPI = express_1.default.Router();
const auth_1 = __importDefault(require("../middleware/auth"));
const dotenv_1 = __importDefault(require("dotenv"));
invoiceAPI.use(express_1.default.json());
const schema_1 = require("../models/schema");
dotenv_1.default.config();
const secretKey = process.env.SECRET_KEY;
invoiceAPI.put("/updateInvoice", auth_1.default, async (req, res) => {
    const { projectId, invoiceUUID, invoice, } = req.body;
    if (!projectId || !invoiceUUID || !invoice) {
        return res
            .status(404)
            .json({ error: "projectid or invoiceUUID or invoice not found" });
    }
    try {
        const project = await schema_1.Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }
        const index = project.invoices.findIndex((invoice) => invoice.uuid === invoiceUUID);
        if (index === -1) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        const clientIdToUpdate = project.invoices[index].client;
        await schema_1.Client.updateOne({ _id: clientIdToUpdate }, { $set: invoice.client });
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
        };
        await project.save();
        return res.status(200).json({ message: "Invoice updated successfully" });
    }
    catch (error) {
        return res.status(500).json({ error: error });
    }
});
invoiceAPI.delete("/deleteInvoice", auth_1.default, async (req, res) => {
    const projectId = req.body.projectId;
    const invoiceUUID = req.body.uuid;
    if (!projectId || !invoiceUUID) {
        return res
            .status(404)
            .json({ error: "projectid or invoiceUUID not found" });
    }
    try {
        const project = await schema_1.Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }
        const index = project.invoices.findIndex((invoice) => invoice.uuid === invoiceUUID);
        if (index === -1) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        project.invoices.splice(index, 1);
        await project.save();
        return res.status(200).json({ message: "Invoice deleted successfully" });
    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});
invoiceAPI.post("/createInvoice", auth_1.default, async (req, res) => {
    const { projectId, invoice, } = req.body;
    if (!invoice.client) {
        return res
            .status(400)
            .json({ error: "Client data is missing in the invoice" });
    }
    try {
        const createdClient = await schema_1.Client.create(invoice.client);
        const clientId = createdClient._id;
        invoice.client = clientId;
        const updatedProject = await schema_1.Project.findOneAndUpdate({ _id: projectId }, { $push: { invoices: invoice } }, { new: true });
        if (!updatedProject) {
            return res.status(404).json({ error: "Project not found" });
        }
        res.status(200).json({
            message: "Invoice created successfully",
            project: updatedProject,
        });
    }
    catch (error) {
        res.status(500).json({ error });
        console.log(error);
    }
});
exports.default = invoiceAPI;
