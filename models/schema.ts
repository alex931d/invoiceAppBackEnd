import { Dayjs } from "dayjs";
import mongoose, { Schema, Document, Model } from "mongoose";

interface IImage extends Document {
  filename: string;
  contentType: string;
  fileId: mongoose.Types.ObjectId;
  url: string;
}

interface IUser extends Document {
  email: string;
  password: string;
  role: string;
  avatar: string | Blob;
  projects: IProject[];
  createdAt: Date;
}
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      project?: IProject;
    }
  }
}
interface IInvoice extends Document {
  uuid: string | null;
  address: string | null;
  city: string | null;
  postCode: number | null;
  country: string | null;
  client: IClient;
  date: Date | null;
  paymentTerms: PaymentTerms;
  description: string | null;
  itemList: IItem[] | null;
  status: Status;
  amount: number;
}

enum Status {
  paid,
  draft,
  pending,
}
enum Filter {
  Name,
  Latest,
  paid,
  pending,
  draft,
}
enum PaymentTerms {
  Net30Days,
  Net15Days,
}

interface IItem extends Document {
  name: string;
  qty: number;
  price: number;
  total: number;
}
interface IClient extends Document {
  Name: string;
  Email: string;
  Address: string;
  City: string;
  postCode: string;
  country: string;
}

interface IProject extends Document {
  name: string;
  description: string;
  invoices: IInvoice[];
  owner: Schema.Types.ObjectId;
}

// schemas
const ImageSchema: Schema = new Schema({
  filename: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
  },
  fileId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
});

const UserSchema = new Schema<IUser>({
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
      type: Schema.Types.ObjectId,
      ref: "Project",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now(),
    required: false,
  },
});

const ProjectSchema = new Schema<IProject>({
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
        type: Schema.Types.ObjectId,
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
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});
const ClientSchema = new Schema<IClient>({
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
const User = mongoose.model<IUser>("User", UserSchema);
const Project = mongoose.model<IProject>("Project", ProjectSchema);
const Client = mongoose.model<IClient>("Client", ClientSchema);
const ImageModel = mongoose.model<IImage>("Image", ImageSchema);

export { User, Project, Client, ImageModel };
export {
  IUser,
  IInvoice,
  IImage,
  Status,
  Filter,
  PaymentTerms,
  IItem,
  IClient,
  IProject,
};
