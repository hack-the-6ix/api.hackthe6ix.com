import { IUser } from '../models/user/fields';
import OTP from '../models/otp/OTP';
import ExternalUser from '../models/externaluser/ExternalUser';
import { BadRequestError, NotFoundError } from '../types/errors';
import { createJwt } from '../services/permissions';

export async function generateOTP(requestUser: IUser, email: string) {
  const externalUser = await ExternalUser.findOne({ email });
  if (!externalUser) {
    throw new BadRequestError('Email not found in external users');
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiration = Date.now() + 10 * 60 * 1000;

  const otp = new OTP({
    code,
    email,
    expiration,
    used: false,
    issuedBy: requestUser.email,
  });

  await otp.save();

  return {
    success: true,
    message: 'OTP generated successfully',
    code,
    expiration: new Date(expiration),
  };
}

export async function verifyOTP(
  requestUser: IUser | null,
  code: string,
  email: string,
) {
  const externalUser = await ExternalUser.findOne({ email });
  if (!externalUser) {
    throw new BadRequestError('Email not found in external users');
  }

  console.log('OTP.findOne', code, email);
  const otp = await OTP.findOne({ code, email });
  if (!otp) {
    throw new NotFoundError('Invalid OTP code');
  }

  if (otp.used) {
    throw new BadRequestError('OTP code already used');
  }

  if (Date.now() > otp.expiration) {
    throw new BadRequestError('OTP code expired');
  }

  otp.used = true;
  otp.usedBy = externalUser._id.toString();
  otp.usedAt = new Date();
  otp.usedName = externalUser.firstName + ' ' + externalUser.lastName;
  await otp.save();

  const token = createJwt({
    id: externalUser._id,
    idpLinkID: `OTP-${externalUser._id}`,
    roles: {
      volunteer: true,
    },
  });

  return {
    success: true,
    message: 'OTP verified successfully',
    user: externalUser,
    token: token,
  };
}

export async function getAllOTPs(requestUser: IUser) {
  const otps = await OTP.find({}).sort({ createdAt: -1 });

  return {
    success: true,
    otps: otps.map((otp) => ({
      id: otp._id,
      code: otp.code,
      email: otp.email,
      used: otp.used,
      expiration: new Date(otp.expiration),
      createdAt: otp.createdAt,
      usedBy: otp.usedBy,
      usedAt: otp.usedAt,
      issuedBy: otp.issuedBy,
      usedName: otp.usedName,
    })),
  };
}

export async function expireOTP(requestUser: IUser, otpId: string) {
  const otp = await OTP.findById(otpId);
  if (!otp) {
    throw new NotFoundError('OTP not found');
  }

  otp.expiration = Date.now();
  await otp.save();

  return {
    success: true,
    message: 'OTP expired successfully',
  };
}
