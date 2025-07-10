import 'dotenv/config';

import * as fs from 'fs';
import * as path from 'path';

import "../services/mongoose_service";

import {log} from "../services/logger";
import {initializeBlobService, getBlobServiceClient} from "../services/azureBlobStorage";

import InitializationRecord from "../models/initializationrecord/InitializationRecord";
import Settings from '../models/settings/Settings';
import MailerList from "../models/mailerlist/MailerList";
import MailerTemplate from "../models/mailertemplate/MailerTemplate";
import {MailingList, MailTemplate} from "../types/mailer";
import {verifyConfigEntity} from "../services/mailer/util/verify_config";
import {dbEvents, mongoose} from "../services/mongoose_service";

// Helper function to read JSON files from Azure Blob Storage
async function readJsonFromAzure(fileName: string): Promise<any> {
  const containerName = process.env.USE_AZURE_CONTAINER_INIT;
  if (!containerName) {
    throw new Error('USE_AZURE_CONTAINER_INIT environment variable is not set');
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
  }

  // Initialize blob service if not already initialized
  try {
    getBlobServiceClient();
  } catch (error) {
    initializeBlobService(connectionString);
  }

  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);

  try {
    const downloadResponse = await blockBlobClient.download();
    const content = await streamToString(downloadResponse.readableStreamBody!);
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read ${fileName} from Azure container ${containerName}: ${error}`);
  }
}

// Helper function to convert stream to string
async function streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (data) => {
      chunks.push(data);
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    readableStream.on('error', reject);
  });
}

// Helper function to read JSON files from either local file system or Azure storage
async function readConfigJson(fileName: string): Promise<any> {
  if (process.env.USE_AZURE_CONTAINER_INIT) {
    log.info(`Reading ${fileName} from Azure container: ${process.env.USE_AZURE_CONTAINER_INIT}`);
    return await readJsonFromAzure(fileName);
  } else {
    log.info(`Reading ${fileName} from local file system`);
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', fileName)).toString('utf8'));
  }
}

async function initializeSettings() {
  const initKey = "settings";

  const initCheck = await InitializationRecord.findOne({
    key: initKey
  })

  if(!initCheck) {
    log.info("Initializing settings.");
    const settingsData = await readConfigJson('settings.json');
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
    const mailerData = await readConfigJson('mailer.json');

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
    const mailerData = await readConfigJson('mailer.json');

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

