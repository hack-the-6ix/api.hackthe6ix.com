// @ts-nocheck
import request from 'supertest';
import express from 'express';
import User from '../../../models/user/User';
import {
  hackerUser,
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../../test-utils';
import actionRouter from '../../../routes/action';
import mongoose from 'mongoose';

jest.mock('../../../controller/AzureBlobStorageController', () => ({
  writeBlob: jest.fn(() => Promise.resolve()),
  getBlobDownloadUrl: jest.fn(
    (container, blobName) => `https://fake.blob/${container}/${blobName}`,
  ),
  exportBlobsAsZip: jest.fn((container, files, res) => {
    res.write('FAKEZIP');
    res.end();
    return Promise.resolve();
  }),
}));

const app = express();
app.use((req, res, next) => {
  // @ts-ignore
  req.executor = { ...hackerUser, _id: new mongoose.Types.ObjectId() };
  next();
});
app.use((req, res, next) => {
  // @ts-ignore
  req.files = req.files || {};
  next();
});
app.use(express.json());
app.use('/api/action', actionRouter);

beforeAll(runBeforeAll);
afterEach(runAfterEach);
beforeEach(runBeforeEach);
afterAll(runAfterAll);

describe('Resume and Waiver Routes', () => {
  test('Upload valid resume', async () => {
    await User.create(hackerUser);
    const res = await request(app)
      .put('/api/action/updateResume')
      .attach('resume', Buffer.from('PDFDATA'), {
        filename: 'resume.pdf',
        contentType: 'application/pdf',
      });
    expect(res.body.status).toBe(200);
    expect(res.body.message).toBe('Success');
  });

  test('Upload invalid resume (not PDF)', async () => {
    await User.create(hackerUser);
    const res = await request(app)
      .put('/api/action/updateResume')
      .attach('resume', Buffer.from('NOTPDF'), {
        filename: 'resume.txt',
        contentType: 'text/plain',
      });
    expect(res.body.status).toBe(403);
  });

  test('Upload too large resume', async () => {
    await User.create(hackerUser);
    const bigBuffer = Buffer.alloc(6000000, 'a');
    const res = await request(app)
      .put('/api/action/updateResume')
      .attach('resume', bigBuffer, {
        filename: 'resume.pdf',
        contentType: 'application/pdf',
      });
    expect(res.body.status).toBe(403);
  });

  test('Get resume URL after upload', async () => {
    await User.create({
      ...hackerUser,
      hackerApplication: { resumeFileName: 'resume.pdf' },
    });
    const res = await request(app).get('/api/action/getResumeURL');
    expect(res.body.status).toBe(200);
    expect(res.body.message).toContain('https://fake.blob/resumes/resume.pdf');
  });

  test('Get resume URL when none exists', async () => {
    await User.create(hackerUser);
    const res = await request(app).get('/api/action/getResumeURL');
    expect(res.body.status).toBe(404);
  });

  test('Export resumes as ZIP', async () => {
    const res = await request(app).get('/api/action/resumeExport');
    expect(res.status).toBe(200);
    expect(res.text).toContain('FAKEZIP');
  });

  test('Upload valid waiver', async () => {
    await User.create(hackerUser);
    const res = await request(app)
      .put('/api/action/updateWaiver')
      .attach('waiver', Buffer.from('PDFDATA'), {
        filename: 'waiver.pdf',
        contentType: 'application/pdf',
      });
    expect(res.body.status).toBe(200);
    expect(res.body.message).toBe('Success');
  });

  test('Upload invalid waiver (not PDF)', async () => {
    await User.create(hackerUser);
    const res = await request(app)
      .put('/api/action/updateWaiver')
      .attach('waiver', Buffer.from('NOTPDF'), {
        filename: 'waiver.txt',
        contentType: 'text/plain',
      });
    expect(res.body.status).toBe(403);
  });

  test('Upload too large waiver', async () => {
    await User.create(hackerUser);
    const bigBuffer = Buffer.alloc(6000000, 'a');
    const res = await request(app)
      .put('/api/action/updateWaiver')
      .attach('waiver', bigBuffer, {
        filename: 'waiver.pdf',
        contentType: 'application/pdf',
      });
    expect(res.body.status).toBe(403);
  });

  test('Get waiver URL after upload', async () => {
    await User.create({
      ...hackerUser,
      hackerApplication: { waiverFileName: 'waiver.pdf' },
    });
    const res = await request(app).get('/api/action/getWaiverURL');
    expect(res.body.status).toBe(200);
    expect(res.body.message).toContain('https://fake.blob/waivers/waiver.pdf');
  });

  test('Get waiver URL when none exists', async () => {
    await User.create(hackerUser);
    const res = await request(app).get('/api/action/getWaiverURL');
    expect(res.body.status).toBe(404);
  });

  test('Export waivers as ZIP', async () => {
    const res = await request(app).get('/api/action/waiverExport');
    expect(res.status).toBe(200);
    expect(res.text).toContain('FAKEZIP');
  });
});
