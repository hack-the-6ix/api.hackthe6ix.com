import axios from "axios";
import { mongoose } from "../services/mongoose_service";
const ObjectId = mongoose.Types.ObjectId;
import Airtable from "airtable";
import { getModels } from "./util/resources";

const NfcSchema = new mongoose.Schema({
    nfcId: { type: String, required: true },
    userId: { type: String, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

const NfcModel = mongoose.model('nfc-user-assignments', NfcSchema);

const NfcUserModel = getModels().user.mongoose;

export const assignNFCToUser = async (nfcId: string, userId: string) => {
    if (!nfcId || !userId) {
        console.log('nfcId and userId are required');
        throw new Error('nfcId and userId are required');
    }

    try {
        const newAssignment = new NfcModel({
            nfcId: nfcId,
            userId: userId,
            createdAt: new Date()
        });

        const savedAssignment = await newAssignment.save();
        return savedAssignment;
    } catch (error: any) {
        console.log(error);
        throw new Error(`Error saving document: ${error.message}`);
    }
};

export const deleteAssignmentByNfc = async (nfcId: string) => {
    if (!nfcId) {
        console.log('nfcId is required');
        throw new Error('nfcId is required');
    }

    try {
        await NfcModel.deleteOne({ nfcId: nfcId });
        console.log(`NFC assignment with nfcId ${nfcId} deleted successfully`);
    } catch (error: any) {
        console.log(error);
        throw new Error(`Error deleting document: ${error.message}`);
    }
}

export const deleteAssignmentByUser = async (userId: string) => {
    if (!userId) {
        console.log('userId is required');
        throw new Error('userId is required');
    }

    try {
        await NfcModel.deleteOne({ userId: userId });
        console.log(`NFC assignment with userId ${userId} deleted successfully`);
    } catch (error: any) {
        console.log(error);
        throw new Error(`Error deleting document: ${error.message}`);
    }
}

export const getUserIdFromNfcId = async (nfcId: string) => {
    if (!nfcId) {
        console.log('nfcId is required');
        throw new Error('nfcId is required');
    }

    try {
        const assignment = await NfcModel.findOne({ nfcId: nfcId });
        return assignment?.userId;
    } catch (error: any) {
        console.log(error);
        throw new Error(`Error finding document: ${error.message}`);
    }
};

export const getUserFromNfcId = async (nfcId: string) => {
    if (!nfcId) {
        console.log('nfcId is required');
        throw new Error('nfcId is required');
    }

    const userId = await getUserIdFromNfcId(nfcId);
    if (!userId) {
        console.log('No user found for the given nfcId');
        return null;
    }

    try {
        const user = await NfcUserModel.findById(userId);
        return user;
    } catch (error: any) {
        console.log(error);
        throw new Error(`Error finding user: ${error.message}`);
    }

}

export const checkIn = async (nfcId: string, field: string) => {
    const userId = await getUserIdFromNfcId(nfcId);

    const existingUser = await NfcUserModel.findById(userId);
    if (!existingUser) {
        throw new Error(`User with ID ${userId} does not exist.`);
    }

    if (!existingUser.checkIns) {
        throw new Error(`User with ID ${userId} does not have any events.`);
    }

    const newCheckIn = new Date().toISOString();

    try {
        const response = await NfcUserModel.updateOne(
            { _id: new ObjectId(userId), checkIns: { $exists: true } },
            { $set: { 
                checkIns: existingUser.checkIns.map((checkIn) => {
                    if (checkIn.event.name === field) {
                        return {
                            ...checkIn,
                            checkIns: [...checkIn.checkIns, newCheckIn]
                        }
                    }
                    return checkIn;
                })
            } },
        );


        return newCheckIn;
    } catch (error: any) {
        console.log(error);
        throw new Error(`Error updating check-ins: ${error.message}`);
    }
}

export const removeLastCheckIn = async (nfcId: string, field: string) => {
    const userId = await getUserIdFromNfcId(nfcId);

    const existingUser = await NfcUserModel.findById(userId);
    if (!existingUser) {
        throw new Error(`User with ID ${userId} does not exist.`);
    }

    if (!existingUser.checkIns) {
        throw new Error(`User with ID ${userId} does not have any events.`);
    }

    const newCheckIns = existingUser.checkIns.map((checkIn: any) => {
        if (checkIn.event.name === field) {
            return {
                ...checkIn,
                checkIns: checkIn.checkIns.slice(0, -1)
            }
        }
        return checkIn;
    });
    try {
        const response = await NfcUserModel.updateOne(
            { _id: new ObjectId(userId), checkIns: { $exists: true } },
            { $set: { checkIns: newCheckIns } }
        );
    } catch (error: any) {
        console.log(error);
        throw new Error(`Error removing last check-in: ${error.message}`);
    }
}

export const populateEvents = async (userId: string) => {
    const airtableToken = process.env.AIRTABLE_TOKEN;

    let events: any[] = [];
    try {

        console.log('airtableToken', airtableToken);

        Airtable.configure({
            endpointUrl: 'https://api.airtable.com',
            apiKey: airtableToken
        });
    
        const base = Airtable.base("app8WOptWZhwtlUam");
    
        const records = await base('Events').select({
            fields: ['Name', 'Start', 'End']
        }).all();
        events = [...records];
    } catch (error: any) {
        console.log(error);
        throw new Error(`Error populating events: ${error.message}`);
    }

    console.log(events);

    const eventsArray = events.map((event: any) => {
        return {
            event: {
                name: event.fields.Name,
                start: event.fields.Start,
                end: event.fields.End
            },
            checkIns: [] // when hackers check in append a some sort of date/time to the checkIns array
        }
    });

    try {
        
        const user = await NfcUserModel.findByIdAndUpdate(
            userId, 
            {
                $set: {
                    checkIns: eventsArray
                }
            },
            { new: true }
        );

        return user;
    } catch (error: any) {
        console.log(error);
        throw new Error(`Error populating events: ${error.message}`);
    }
}
