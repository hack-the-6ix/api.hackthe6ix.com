import 'dotenv/config';

import * as fs from 'fs';
import * as path from 'path';

import "../services/mongoose_service";

import {log} from "../services/logger";

import InitializationRecord from "../models/initializationrecord/InitializationRecord";
import Settings from '../models/settings/Settings';
import MailerList from "../models/mailerlist/MailerList";
import MailerTemplate from "../models/mailertemplate/MailerTemplate";
import {MailingList, MailTemplate} from "../types/mailer";
import {verifyConfigEntity} from "../services/mailer/util/verify_config";
import {dbEvents, mongoose} from "../services/mongoose_service";

// TODO: ADd this script to run first before all npm scripts and Docker container!

async function initializeSettings() {
  const initKey = "settings";

  const initCheck = await InitializationRecord.findOne({
    key: initKey
  })

  if(!initCheck) {
    log.info("Initializing settings.");
    const settingsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'settings.json')).toString('utf8'));
    await Settings.findOneAndUpdate({}, settingsData, {
      upsert: true
    })

    await InitializationRecord.create({
      key: initKey,
      version: 1
    });

    log.info("Finished initializing settings.");

    return true;
  }

  log.info("Skipping initialization of settings.");

  return false;
}

async function initializeTemplates() {
  const initKey = "mailer.templates";

  const initCheck = await InitializationRecord.findOne({
    key: initKey
  })

  if(!initCheck) {
    log.info("Initializing mail templates.");
    const mailerData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'mailer.json')).toString('utf8'));

    // Verify templates
    verifyConfigEntity(mailerData, MailTemplate, 'templates', ['templateID']);

    const dataRoot = mailerData["templates"]
    await MailerTemplate.create(Object.keys(dataRoot).map((name) => {
      return {
        name,
        templateID: dataRoot[name]["templateID"]
      }
    }));

    await InitializationRecord.create({
      key: initKey,
      version: 1
    });

    log.info("Finished initializing mail templates.");

    return true;
  }

  log.info("Skipping initialization of mail templates.");

  return false;
}

async function initializeLists() {
  const initKey = "mailer.lists";

  const initCheck = await InitializationRecord.findOne({
    key: initKey
  })

  if(!initCheck) {
    log.info("Initializing mailing lists.");
    const mailerData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'mailer.json')).toString('utf8'));

    // Verify lists
    verifyConfigEntity(mailerData, MailingList, 'lists', ['listID', 'query']);

    const dataRoot = mailerData["lists"]
    await MailerList.create(Object.keys(dataRoot).map((name) => {
      return {
        name,
        listID: dataRoot[name]["listID"],
        query: dataRoot[name]["query"],
        filterQuery: dataRoot[name]["filterQuery"]
      }
    }));

    await InitializationRecord.create({
      key: initKey,
      version: 1
    });

    log.info("Finished initializing mailing lists.");

    return true;
  }

  log.info("Skipping initialization of mailing lists.");

  return false;
}

async function ensureInit():Promise<void> {
  const promises = [
      initializeSettings(), initializeTemplates(), initializeLists()
  ];

  const results = await Promise.allSettled(promises);
  for(const result of results){
    if(result.status === "rejected") {
      throw result.reason;
    }
  }
}

log.info("Waiting for MongoDB...");
dbEvents.on('connected', () => {
  ensureInit().then(() => {
    log.info("Finished database initialization.");
    mongoose.disconnect().then(() => {
      log.info("Closed all connections. Exiting.");
      process.exit(0);
    })
  }).catch((err) => {
    log.error("Encountered error during database initialization.", err);
  })
})

