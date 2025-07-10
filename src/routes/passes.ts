import express, { Request, Response } from "express";
import { PKPass } from "passkit-generator";
import fs from "fs";
import path from "path";
import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";


const router = express.Router();

const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const issuerId = process.env.GOOGLE_ISSUER_ID;
const Google = new GoogleAuth({
    credentials: JSON.parse(credentials || "{}"),
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
});
const baseUrl = "https://walletobjects.googleapis.com/walletobjects/v1";
const classId = `${issuerId}.hackathon2025`;

async function createPassClass(): Promise<void> {
    const httpClient = await Google.getClient();

    let genericClass = {
        "id": classId,
        "eventName": {
          "defaultValue": {
            "language": "en-US",
            "value": "Hack The 6ix 2025"
          }
        },
        "issuerName": "Hack The 6ix",
        "reviewStatus": "UNDER_REVIEW",
        "seatNumberLabel": {
          "defaultValue": {
            "language": "en-US",
            "value": "Team"
          }
        },
        "locations": [
          {
            "latitude": 43.7731,
            "longitude": 79.5038
          }
        ],
        "startDate": "2025-09-12T09:00:00Z",
        "endDate":   "2025-09-14T18:00:00Z",
        "hexBackgroundColor": "#4285F4",
        "logo": {
          "sourceUri": { "uri": "https://hackthe6ix.com/icon.png?c9f2203f230562e3" },
          "contentDescription": {
            "defaultValue": { "language":"en-US","value":"Hackathon Logo" }
          }
        }
      };
      
      let response;
      try {
        // Check if the class exists already
        response = await httpClient.request({
          url: `${baseUrl}/genericClass/${classId}`,
          method: 'GET'
        });
      
        console.log('Class already exists');
        console.log(response);
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          // Class does not exist
          // Create it now
          response = await httpClient.request({
            url: `${baseUrl}/genericClass`,
            method: 'POST',
            data: genericClass
          });
      
          console.log('Class insert response');
          console.log(response);
        } else {
          // Something else went wrong
          console.log(err);
          throw err;
        }
      }
}

async function createPassObject(userID: string, userType: string): Promise<string> {

    let objectSuffix = `${userID.replace(/[^\w.-]/g, '_')}`;

    let genericObject = {
        "id": `${issuerId}.${objectSuffix}`,
        "classId": classId,
        "state": "ACTIVE",
        'cardTitle': {
            'defaultValue': {
            'language': 'en',
            'value': 'Hack The 6ix 2025'
            }
        },
        "barcode": {
            "type": "QR_CODE",
            "value": JSON.stringify({
                userID: userID,
                userType: userType,
            }),        
            "alternateText": `${userID}`
        },
        'subheader': {
            'defaultValue': {
            'language': 'en',
            'value': 'Hacker'
            }
        },
        'header': {
            'defaultValue': {
            'language': 'en',
            'value': `${userID}`
            }
        },
        'heroImage': {
            'sourceUri': {
            'uri': 'https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/google-io-hero-demo-only.jpg'
            }
        },
        "textModulesData": [
            {
                "header": "Check-In Instructions",
                "body": "Please show this QR code at the door."
            }
        ]
    }

    const claims = {
        iss: JSON.parse(credentials || "{}").client_email,
        aud: 'google',
        origins: [],
        typ: 'savetowallet',
        payload: {
            genericObjects: [
            genericObject
            ]
        }
    }

    const token = jwt.sign(claims, JSON.parse(credentials || "{}").private_key, { algorithm: 'RS256' });
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

    return saveUrl;
}

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

router.get("/google/hackathon.pkpass", async (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    const userType = req.query.userType as string;

    await createPassClass();
    
    try {
        const saveUrl = await createPassObject(userId, userType);
        res.json({
            saveUrl: saveUrl
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to generate pass" });
    }
});

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
