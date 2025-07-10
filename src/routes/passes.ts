import express, { Request, Response } from "express";
import { PKPass } from "passkit-generator";
import fs from "fs";
import path from "path";
import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";

const router = express.Router();

interface User {
    id: string;
    type: string;
    name: string;
}

const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const issuerId = process.env.GOOGLE_ISSUER_ID;
const Google = new GoogleAuth({
    credentials: JSON.parse(credentials || "{}"),
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
});
const baseUrl = "https://walletobjects.googleapis.com/walletobjects/v1";
const classId = `${issuerId}.hackthe6ix`;

async function createPassClass(): Promise<void> {
    const httpClient = await Google.getClient();

    let genericClass = {
        'id': `${classId}`,
        'classTemplateInfo': {
          'cardTemplateOverride': {
            'cardRowTemplateInfos': [
              {
                'twoItems': {
                  'startItem': {
                    'firstValue': {
                      'fields': [
                        {
                          'fieldPath': 'object.textModulesData[\'address\']'
                        }
                      ]
                    }
                  },
                  'endItem': {
                    'firstValue': {
                      'fields': [
                        {
                          'fieldPath': 'object.textModulesData[\'date\']'
                        }
                      ]
                    }
                  }
                }
              }
            ]
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

async function createPassObject(user: User): Promise<string> {

    let objectSuffix = `${user.id.replace(/[^\w.-]/g, '_')}`;

    let genericObject = {
        'id': `${issuerId}.${objectSuffix}`,
        'classId': classId,
        'genericType': 'GENERIC_TYPE_UNSPECIFIED',
        'state': 'ACTIVE',
        'cardTitle': {
            'defaultValue': {
                'language': 'en',
                'value': 'Hack The 6ix 2025'
            }
        },
        'hexBackgroundColor': '#CFEDAF',
        'barcode': {
            'type': 'QR_CODE',
            'value': JSON.stringify({
                'userID': user.id,
                'userType': user.type,
            }),        
            'alternateText': `${user.id}`
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
                'value': `${user.name}`
            }
        },
        'heroImage': {
            'sourceUri': {
                'uri': 'https://miro.medium.com/v2/resize:fit:1400/1*IMRytrOprJjmRPKEdtt6Aw.png'
            }
        },
        'logo': {
            'sourceUri': {
                'uri': 'https://hackthe6ix.com/icon.png?c9f2203f230562e3'
            }
        },
        'textModulesData': [
            {
                'id': 'address',
                'header': 'Address',
                'body': 'York University Keele Campus,\n Accolade East Building'
            },
              {
                'id': 'date',
                'header': 'July 18, 2025',
                'body': '8:00 PM'
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

const generateApplePass = async (user: User) => {
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
            },
        });

        pass.auxiliaryFields.push(
            {
                "key": "hacker",
                "label": "HACKER",
                "value": user.name,
                "textAlignment": "PKTextAlignmentLeft"
            }
        );

        pass.auxiliaryFields.push(
            {
                "key": "additionalInfo",
                "label": "ADDITIONAL INFO",
                "value": "Accolade East Building",
                "textAlignment": "PKTextAlignmentRight"
            }
        );

        const barcodeString = JSON.stringify({
            userID: user.id || "test-id",
            userType: user.type || "test-type",
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
    const userName = req.query.userName as string;

    await createPassClass();
    
    try {
        const saveUrl = await createPassObject({
            id: userId,
            type: userType,
            name: userName || ""
        });
        res.json({
            saveUrl: saveUrl
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to generate pass" });
    }
});

router.get("/apple/hackathon.pkpass", async (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    const userType = req.query.userType as string;
    const userName = req.query.userName as string;

    try {
        const buffer = await generateApplePass({
            id: userId,
            type: userType,
            name: userName || ""
        });
        res.type("application/vnd.apple.pkpass")
        .set("Content-Disposition", 'inline; filename="hackathon.pkpass"')
        .send(buffer);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to generate pass" });
    }
});

export default router;
