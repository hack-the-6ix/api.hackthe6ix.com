import {
  generateOTP,
  verifyOTP,
  getAllOTPs,
  expireOTP,
} from '../../controller/OTPController';
import OTP from '../../models/otp/OTP';
import ExternalUser from '../../models/externaluser/ExternalUser';
import { BadRequestError, NotFoundError } from '../../types/errors';
import {
  getError,
  organizerUser,
  externalUser,
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../test-utils';

beforeAll(runBeforeAll);

afterEach(runAfterEach);

beforeEach(runBeforeEach);

afterAll(runAfterAll);

describe('OTP Controller', () => {
  let testExternalUser: any;
  let testOTP: any;

  beforeEach(async () => {
    testExternalUser = await ExternalUser.create(externalUser);
  });

  describe('generateOTP', () => {
    test('should generate OTP for valid external user', async () => {
      const result = await generateOTP(organizerUser, testExternalUser.email);

      expect(result.success).toBe(true);
      expect(result.code).toHaveLength(6);
      expect(result.message).toBe('OTP generated successfully');

      const savedOTP = await OTP.findOne({ email: testExternalUser.email });
      expect(savedOTP).toBeTruthy();
      expect(savedOTP.issuedBy).toBe(organizerUser.email);
      expect(savedOTP.used).toBe(false);
    });

    test('should not generate OTP for invalid email', async () => {
      const error = await getError<BadRequestError>(() =>
        generateOTP(organizerUser, 'invalid@email.com'),
      );

      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Email not found in external users');
    });
  });

  describe('verifyOTP', () => {
    beforeEach(async () => {
      const result = await generateOTP(organizerUser, testExternalUser.email);
      testOTP = await OTP.findOne({ code: result.code });
    });

    test('should verify valid OTP', async () => {
      const result = await verifyOTP(
        organizerUser,
        testOTP.code,
        testExternalUser.email,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('OTP verified successfully');
      expect(result.user._id.toString()).toBe(testExternalUser._id.toString());
      expect(result.token).toBeTruthy();

      const updatedOTP = await OTP.findById(testOTP._id);
      expect(updatedOTP.used).toBe(true);
      expect(updatedOTP.usedBy).toBe(testExternalUser._id.toString());
      expect(updatedOTP.usedName).toBe(
        `${testExternalUser.firstName} ${testExternalUser.lastName}`,
      );
      expect(updatedOTP.usedAt).toBeTruthy();
    });

    test('should not verify already used OTP', async () => {
      await verifyOTP(organizerUser, testOTP.code, testExternalUser.email);

      const error = await getError<BadRequestError>(() =>
        verifyOTP(organizerUser, testOTP.code, testExternalUser.email),
      );

      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('OTP code already used');
    });

    test('should not verify invalid OTP code', async () => {
      const error = await getError<NotFoundError>(() =>
        verifyOTP(organizerUser, '000000', testExternalUser.email),
      );

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Invalid OTP code');
    });

    test('should not verify OTP for invalid email', async () => {
      const error = await getError<BadRequestError>(() =>
        verifyOTP(organizerUser, testOTP.code, 'invalid@email.com'),
      );

      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Email not found in external users');
    });
  });

  describe('getAllOTPs', () => {
    beforeEach(async () => {
      await generateOTP(organizerUser, testExternalUser.email);
    });

    test('should return all OTPs with correct fields', async () => {
      const result = await getAllOTPs(organizerUser);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.otps)).toBe(true);
      expect(result.otps.length).toBeGreaterThan(0);

      const otp = result.otps[0];
      expect(otp).toHaveProperty('id');
      expect(otp).toHaveProperty('code');
      expect(otp).toHaveProperty('email');
      expect(otp).toHaveProperty('used');
      expect(otp).toHaveProperty('expiration');
      expect(otp).toHaveProperty('createdAt');
      expect(otp).toHaveProperty('usedBy');
      expect(otp).toHaveProperty('usedAt');
      expect(otp).toHaveProperty('issuedBy');
      expect(otp).toHaveProperty('usedName');
    });
  });

  describe('expireOTP', () => {
    beforeEach(async () => {
      const result = await generateOTP(organizerUser, testExternalUser.email);
      testOTP = await OTP.findOne({ code: result.code });
    });

    test('should expire existing OTP', async () => {
      const result = await expireOTP(organizerUser, testOTP._id.toString());

      expect(result.success).toBe(true);
      expect(result.message).toBe('OTP expired successfully');

      const expiredOTP = await OTP.findById(testOTP._id);
      expect(expiredOTP).toBeTruthy();
      expect(expiredOTP.expiration).toBeLessThanOrEqual(Date.now());
    });

    test('should not expire non-existent OTP', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const error = await getError<NotFoundError>(() =>
        expireOTP(organizerUser, fakeId),
      );

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('OTP not found');
    });
  });
});
