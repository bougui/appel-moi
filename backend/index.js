const AWS = require('aws-sdk');
const twilio = require('twilio');

const ssm = new AWS.SSM();
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WORKFLOW_SID = process.env.TWILIO_WORKFLOW_SID;

let cachedPassword = null;
let cachedPhoneNumbers = null;
const PROJECT_NAME = process.env.PROJECT_NAME || 'twilio-transfer';
const ENVIRONMENT = process.env.ENVIRONMENT || 'prod';

async function getSSMParameter(paramName) {
    const { Parameter } = await ssm.getParameter({
        Name: `/${PROJECT_NAME}/${ENVIRONMENT}/${paramName}`,
        WithDecryption: true
    }).promise();
    return Parameter.Value;
}

async function validatePhoneNumber(phoneNumber) {
    if (!cachedPhoneNumbers) {
        const phoneNumbersStr = await getSSMParameter('phone_numbers');
        cachedPhoneNumbers = JSON.parse(phoneNumbersStr);
    }
    return cachedPhoneNumbers.includes(phoneNumber);
}

async function validatePassword(password) {
    if (!cachedPassword) {
        cachedPassword = await getSSMParameter('app_password');
    }
    return password === cachedPassword;
}

exports.handler = async (event) => {
    try {
        // Gestion CORS
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                },
                body: ''
            };
        }

        const body = JSON.parse(event.body);
        
        // Vérification du mot de passe
        if (!await validatePassword(body.password)) {
            return {
                statusCode: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Non autorisé' })
            };
        }

        // Vérification du numéro de téléphone
        if (!await validatePhoneNumber(body.phoneNumber)) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Numéro de téléphone non autorisé' })
            };
        }

        // Ajout d'un endpoint GET pour récupérer la liste des numéros
        if (event.httpMethod === 'GET') {
            const phoneNumbers = await getSSMParameter('phone_numbers');
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: phoneNumbers
            };
        }

        // Mise à jour du workflow Twilio
        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        await client.taskrouter.v1
            .workspaces(TWILIO_WORKFLOW_SID)
            .workflows(TWILIO_WORKFLOW_SID)
            .update({
                assignmentCallbackUrl: `http://your-twilio-callback-url?target=${body.phoneNumber}`
            });

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ message: 'Transfert mis à jour avec succès' })
        };
    } catch (error) {
        console.error('Erreur:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Erreur interne du serveur' })
        };
    }
}; 