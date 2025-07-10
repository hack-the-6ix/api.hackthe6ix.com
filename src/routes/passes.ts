import express, { Request, Response } from "express";
import { PKPass } from "passkit-generator";
import fs from "fs";
import path from "path";

const router = express.Router();

const generateApplePass = async (userID: string, userType: string) => {
    try {
        const wwdr = fs.readFileSync(path.join(process.cwd(), './src/assets/passes/apple/wwdr.pem'), 'utf8');
        const signerCert = fs.readFileSync(path.join(process.cwd(), './src/assets/passes/apple/signerCert.pem'), 'utf8');
        const signerKey = fs.readFileSync(path.join(process.cwd(), './src/assets/passes/apple/signerKey.pem'), 'utf8');
        const pass = await PKPass.from({
            model: path.join(process.cwd(), './src/assets/passes/apple.pass'),
            certificates: {
                wwdr,
                signerCert: signerCert,    
                signerKey: signerKey,
                signerKeyPassphrase: process.env.SIGNER_KEY_PASSPHRASE
            }   
        });

        const barcodeString = JSON.stringify({
            userID: userID || "test-id",
            userType: userType || "test-type",
        })

        pass.setBarcodes(barcodeString);
        const buffer = pass.getAsBuffer();

        return buffer;

    } catch (error) {
        console.log(error);
        console.log("error");
        throw error;
    }
}


router.post('/apple/hackathon.pkpass', async (req: Request, res: Response) => {

    const userID = req.body.userID;
    const userType = req.body.userType;
    
    try {
        const buffer = await generateApplePass(userID, userType);
        res.type("application/vnd.apple.pkpass")
        .set("Content-Disposition", 'inline; filename="hackathon.pkpass"')
        .send(buffer);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to generate pass" });
    }
});

router.post("/test", async (req: Request, res: Response) => {
    res.json({
        message: "true"
    });
});

router.get("/apple/hackathon.pkpass", async (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    const userType = req.query.userType as string;

    try {
        const buffer = await generateApplePass(userId, userType);
        res.type("application/vnd.apple.pkpass")
        .set("Content-Disposition", 'inline; filename="hackathon.pkpass"')
        .send(buffer);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to generate pass" });
    }
});

export default router;
