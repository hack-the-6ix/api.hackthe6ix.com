import express, {Request, Response} from "express";

import { isConnected } from "../services/mongoose_service";

import { 
    assignNFCToUser, 
    getUserIdFromNfcId, 
    getUserFromNfcId, 
    deleteAssignmentByNfc, 
    deleteAssignmentByUser, 
    checkIn, 
    populateEvents,
    removeLastCheckIn 
} from "../controller/NfcController";

import { isVolunteer } from "../models/validator";

const nfcRouter = express.Router();

nfcRouter.post('/assign', async (req: Request, res: Response) => {
    try {
        await assignNFCToUser(req.body.nfcId, req.body.userId);
        return res.status(200).json({ message: 'NFC assigned successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to assign NFC Id' });
    }
});

nfcRouter.get('/getUserId/:nfcId', async (req: Request, res: Response) => {
    try {
        const userId = await getUserIdFromNfcId(req.params.nfcId);
        return res.status(200).json({ userId });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to get user Id' });
    }
});

nfcRouter.delete('/deleteAssignmentByNfc/:nfcId', async (req: Request, res: Response) => {
    try {
        await deleteAssignmentByNfc(req.params.nfcId);
        return res.status(200).json({ message: 'NFC assignment deleted successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to delete assignment' });
    }
});

nfcRouter.delete('/deleteAssignmentByUser/:userId', async (req: Request, res: Response) => {
    try {
        await deleteAssignmentByUser(req.params.userId);
        return res.status(200).json({ message: 'NFC assignment deleted successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to delete assignment' });
    }
});

nfcRouter.get('/test', (req: Request, res: Response) => { 
    return res.json({test: 'true'})
});

nfcRouter.get('/getUser/:nfcId', async (req: Request, res: Response) => {
    try {
        const user = await getUserFromNfcId(req.params.nfcId);
        return res.status(200).json({ user });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to get user' });
    }
});

nfcRouter.post('/checkInFromNFC', async (req: Request, res: Response) => {
    const { nfcId, checkInEvent } = req.body;

    try {
        const response = await checkIn(nfcId, checkInEvent);
        return res.status(200).json({ response });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update check-ins' });
    }
});

nfcRouter.post('/removeLastCheckIn', async (req: Request, res: Response) => {
    const { nfcId, checkInEvent } = req.body;

    try {
        const response = await removeLastCheckIn(nfcId, checkInEvent);
        return res.status(200).json({ response });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update check-ins' });
    }
});

nfcRouter.post('/populateEvents', async (req: Request, res: Response) => {
    const { userId } = req.body;

    try {
        const response = await populateEvents(userId);
        return res.status(200).json({ response });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to populate events' });
    }
});

export default nfcRouter;
