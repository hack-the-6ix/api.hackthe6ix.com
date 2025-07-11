import {
  CreateCheckRequest,
  DeleteCheckRequest,
  ReadCheckRequest,
  WriteCheckRequest,
} from '../../types/checker';
import { BasicUser } from '../../types/types';
import { isOrganizer } from '../validator';

export const fields = {
  createCheck: (request: CreateCheckRequest<any, any>) =>
    isOrganizer(request.requestUser),
  readCheck: (request: ReadCheckRequest<any>) =>
    isOrganizer(request.requestUser),
  deleteCheck: (request: DeleteCheckRequest<any>) =>
    isOrganizer(request.requestUser),
  writeCheck: (request: WriteCheckRequest<any, any>) =>
    isOrganizer(request.requestUser),
  FIELDS: {
    _id: {
      virtual: true,
      readCheck: true,
    },
    code: {
      type: String,
      required: true,
      readCheck: true,
      writeCheck: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
      readCheck: true,
      writeCheck: true,
    },
    expiration: {
      type: Number,
      required: true,
      readCheck: true,
      writeCheck: true,
    },
    used: {
      type: Boolean,
      required: true,
      default: false,
      readCheck: true,
      writeCheck: true,
    },
    usedBy: {
      type: String,
      default: null,
      readCheck: true,
      writeCheck: true,
    },
    usedAt: {
      type: Date,
      default: null,
      readCheck: true,
      writeCheck: true,
    },
    issuedBy: {
      type: String,
      required: true,
      readCheck: true,
      writeCheck: true,
    },
    usedName: {
      type: String,
      default: null,
      readCheck: true,
      writeCheck: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      readCheck: true,
    },
  },
};

export interface IOTP extends BasicUser {
  code: string;
  email: string;
  expiration: number;
  used: boolean;
  createdAt: Date;
  usedBy?: string | null;
  usedAt?: Date | null;
  issuedBy: string;
  usedName?: string | null;
}
