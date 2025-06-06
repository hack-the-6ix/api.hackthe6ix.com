import mongoose from 'mongoose';
import { releaseApplicationStatus } from '../../../controller/UserController';
import User from '../../../models/user/User';
import syncMailingLists from '../../../services/mailer/syncMailingLists';
import {
  hackerUser,
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../../test-utils';

/**
 * Connect to a new in-memory database before running any tests.
 */
beforeAll(runBeforeAll);

/**
 * Clear all test data after every test.
 */
afterEach(runAfterEach);

beforeEach(runBeforeEach);

/**
 * Remove and close the db and server.
 */
afterAll(runAfterAll);

jest.mock('../../../services/mailer/syncMailingLists', () => jest.fn((): any => undefined));

describe('Release Admission Status', () => {

  test('Status Already Released', async () => {
    const hacker = await User.create({
      ...hackerUser,
      status: {
        statusReleased: true,
      },
    });

    const result = await releaseApplicationStatus();

    expect(result.length).toEqual(0);
    expect((await User.findOne({ _id: hacker._id })).toJSON().status.statusReleased).toBeTruthy();
  });

  test('State not assigned', async () => {
    const hacker = await User.create({
      ...hackerUser,
      status: {
        statusReleased: false,
      },
    });

    const result = await releaseApplicationStatus();

    expect(result.length).toEqual(0);
    expect((await User.findOne({ _id: hacker._id })).toJSON().status.statusReleased).toBeFalsy();
  });

  test('Accepted', async () => {
    const hacker = await User.create({
      ...hackerUser,
      status: {
        statusReleased: false,
        accepted: true,
      },
    });

    const result = await releaseApplicationStatus();

    expect(result).toEqual([
      hacker._id.toString(),
    ]);
    expect((await User.findOne({ _id: hacker._id })).toJSON().status.statusReleased).toBeTruthy();
  });

  test('Rejected', async () => {
    const hacker = await User.create({
      ...hackerUser,
      status: {
        statusReleased: false,
        rejected: true,
      },
    });

    const result = await releaseApplicationStatus();

    expect(result).toEqual([
      hacker._id.toString(),
    ]);
    expect((await User.findOne({ _id: hacker._id })).toJSON().status.statusReleased).toBeTruthy();
  });

  test('Waitlisted', async () => {
    const hacker = await User.create({
      ...hackerUser,
      status: {
        statusReleased: false,
        waitlisted: true,
      },
    });

    const result = await releaseApplicationStatus();

    expect(result).toEqual([
      hacker._id.toString(),
    ]);
    expect((await User.findOne({ _id: hacker._id })).toJSON().status.statusReleased).toBeTruthy();
  });

  test('Lots of stuff', async () => {
    const hackerRejected = await User.create({
      ...hackerUser,
      _id: new mongoose.Types.ObjectId(),
      status: {
        statusReleased: false,
        rejected: true,
      },
    });
    const hackerAccepted = await User.create({
      ...hackerUser,
      _id: new mongoose.Types.ObjectId(),
      status: {
        statusReleased: false,
        accepted: true,
      },
    });
    const hackerWaitlisted = await User.create({
      ...hackerUser,
      _id: new mongoose.Types.ObjectId(),
      status: {
        statusReleased: false,
        waitlisted: true,
      },
    });
    const hackerNoStatus = await User.create({
      ...hackerUser,
      _id: new mongoose.Types.ObjectId(),
      status: {
        statusReleased: false,
      },
    });

    const result = await releaseApplicationStatus();

    expect(result).toEqual([
      hackerRejected._id.toString(),
      hackerAccepted._id.toString(),
      hackerWaitlisted._id.toString(),
    ]);

    expect((await User.findOne({ _id: hackerRejected._id })).toJSON().status.statusReleased).toBeTruthy();
    expect((await User.findOne({ _id: hackerAccepted._id })).toJSON().status.statusReleased).toBeTruthy();
    expect((await User.findOne({ _id: hackerWaitlisted._id })).toJSON().status.statusReleased).toBeTruthy();
    expect((await User.findOne({ _id: hackerNoStatus._id })).toJSON().status.statusReleased).toBeFalsy();

    expect(syncMailingLists).toHaveBeenCalled();
  });
});
