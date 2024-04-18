"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentTerms = exports.Filter = exports.Status = exports.ImageModel = exports.Client = exports.Project = exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var Status;
(function (Status) {
    Status[Status["paid"] = 0] = "paid";
    Status[Status["draft"] = 1] = "draft";
    Status[Status["pending"] = 2] = "pending";
})(Status || (exports.Status = Status = {}));
var Filter;
(function (Filter) {
    Filter[Filter["Name"] = 0] = "Name";
    Filter[Filter["Latest"] = 1] = "Latest";
    Filter[Filter["paid"] = 2] = "paid";
    Filter[Filter["pending"] = 3] = "pending";
    Filter[Filter["draft"] = 4] = "draft";
})(Filter || (exports.Filter = Filter = {}));
var PaymentTerms;
(function (PaymentTerms) {
    PaymentTerms[PaymentTerms["Net30Days"] = 0] = "Net30Days";
    PaymentTerms[PaymentTerms["Net15Days"] = 1] = "Net15Days";
})(PaymentTerms || (exports.PaymentTerms = PaymentTerms = {}));
// schemas
const ImageSchema = new mongoose_1.Schema({
    filename: {
        type: String,
        required: true,
    },
    contentType: {
        type: String,
        required: true,
    },
    fileId: {
        type: mongoose_1.default.Types.ObjectId,
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
});
const UserSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
    },
    avatar: {
        type: String,
        required: true,
    },
    projects: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Project",
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now(),
        required: false,
    },
});
const ProjectSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    invoices: [
        {
            uuid: {
                type: String,
                required: true,
            },
            address: {
                type: String,
                required: true,
            },
            city: {
                type: String,
                required: true,
            },
            postCode: {
                type: Number,
                required: true,
            },
            country: {
                type: String,
                required: true,
            },
            client: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "Client",
            },
            date: {
                type: Date,
                required: true,
            },
            paymentTerms: {
                type: String,
                enum: [0, 1],
                required: true,
            },
            description: {
                type: String,
                required: false,
            },
            itemList: [
                {
                    name: {
                        type: String,
                        required: true,
                    },
                    qty: {
                        type: Number,
                        required: true,
                    },
                    price: {
                        type: Number,
                        required: true,
                    },
                    total: {
                        type: Number,
                        required: true,
                    },
                },
            ],
            status: {
                type: String,
                enum: [0, 1, 2],
                required: true,
            },
            amount: {
                type: Number,
                required: true,
            },
        },
    ],
    owner: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
});
const ClientSchema = new mongoose_1.Schema({
    Name: {
        type: String,
        required: true,
    },
    Email: {
        type: String,
        required: true,
    },
    Address: {
        type: String,
        required: true,
    },
    City: {
        type: String,
        required: true,
    },
    postCode: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
});
const User = mongoose_1.default.model("User", UserSchema);
exports.User = User;
const Project = mongoose_1.default.model("Project", ProjectSchema);
exports.Project = Project;
const Client = mongoose_1.default.model("Client", ClientSchema);
exports.Client = Client;
const ImageModel = mongoose_1.default.model("Image", ImageSchema);
exports.ImageModel = ImageModel;
