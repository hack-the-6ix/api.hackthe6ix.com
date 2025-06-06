import { exportBlobsAsZip } from '../controller/AzureBlobStorageController';
import {mongoose} from '../services/mongoose_service';
import {Writable} from 'stream';
import User from '../models/user/User';
import {extname} from 'path';

export const resumeExport = async (outputStream: Writable) => {
    const resumeUsers = await User.find({
        $or: [{
            "status.accepted": true
        }, {
            "status.waitlisted": true
        }],
        "hackerApplication.resumeSharePermission": true,
        "hackerApplication.resumeFileName": {
            $exists: true
        }
    }, {
        "firstName": 1,
        "lastName": 1,
        "hackerApplication.resumeSharePermission": 1,
        "hackerApplication.resumeFileName": 1
    });

    const filenames = resumeUsers.map((user) => {
        const resumeExtension = extname(user.hackerApplication.resumeFileName);
        return {
            blobname: user.hackerApplication.resumeFileName,
            filename: `${user.firstName}_${user.lastName}_Resume_${user._id}${resumeExtension}`
        };
    });

    await exportBlobsAsZip('resumes', filenames, outputStream);

    return;
}