const AWS = require('aws-sdk');
const twilio = require('twilio');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new AWS.SSM();
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WORKFLOW_SID = process.env.TWILIO_WORKFLOW_SID;

let cachedPassword = null;
let cachedPhoneNumbers = null;
const PROJECT_NAME = process.env.PROJECT_NAME || 'twilio-transfer';
const ENVIRONMENT = process.env.ENVIRONMENT || 'prod';

// Ajoutez la description du projet aux logs
const projectDescription = process.env.PROJECT_DESCRIPTION || 'Description non définie';

// Récupérer l'URL du frontend depuis les variables d'environnement
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://camp-paul-b.vercel.app';

const corsHeaders = {
    'Access-Control-Allow-Origin': FRONTEND_URL,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Credentials': true
};

async function getSSMParameter(paramName) {
    const AWS = require('aws-sdk');
    const ssm = new AWS.SSM();
    console.log(`Récupération du paramètre SSM: ${paramName}`);
    try {
        const { Parameter } = await ssm.getParameter({
            Name: `/${process.env.PROJECT_NAME}/${process.env.ENVIRONMENT}/${paramName}`,
            WithDecryption: true
        }).promise();
        return Parameter.Value;
    } catch (error) {
        console.error(`Erreur SSM pour ${paramName}:`, error);
        throw error;
    }
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
    console.log(`Description du projet: ${projectDescription}`);
    console.log('Méthode:', event.requestContext.http.method);

    // Gestion OPTIONS
    if (event.requestContext.http.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    // Gestion POST
    if (event.requestContext.http.method === 'POST') {
        try {
            const body = JSON.parse(event.body || '{}');
            const storedUsername = await getSSMParameter('app_username');
            const storedPassword = await getSSMParameter('app_password');
            const decodedPassword = decodeURIComponent(body.password || '');
            const decodedUsername = decodeURIComponent(body.username || '');

            if (decodedUsername !== storedUsername || decodedPassword !== storedPassword) {
                return {
                    statusCode: 401,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Non autorisé' })
                };
            }

            // Demande de transfert
            if (body.phoneNumber) {
                try {
                    const phoneData = JSON.parse(body.phoneNumber);
                    console.log('Transfert demandé vers:', phoneData.description);
                    
                    const accountSid = await getSSMParameter('twilio_account_sid');
                    const authToken = await getSSMParameter('twilio_auth_token');
                    const twilioNumber = await getSSMParameter('twilio_number');
                    const phoneSid = await getSSMParameter('twilio_phone_sid');
                    const twimlSid = await getSSMParameter('twilio_twiml_sid');
                    const client = twilio(accountSid, authToken);

                    // Mise à jour du transfert
                    await client.incomingPhoneNumbers(phoneSid)
                        .update({
                            voiceUrl: `https://handler.twilio.com/twiml/${twimlSid}?ForwardTo=${phoneData.number}`
                        });

                    // Formatage de la date et heure
                    const now = new Date();
                    const dateStr = now.toLocaleString('fr-CA', {
                        timeZone: 'America/Montreal',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });

                    // Envoi du SMS seulement si sendSms est true
                    if (phoneData.sendSms !== false) {
                        await client.messages.create({
                            body: `Ton numéro est associé au camp Paul B (${dateStr})\nLe club des 2 de piques`,
                            from: twilioNumber,
                            to: phoneData.number
                        });
                    }

                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({ 
                            message: `Transfert configuré vers ${phoneData.description}`,
                            smsSent: phoneData.sendSms !== false
                        })
                    };
                } catch (error) {
                    console.error('Erreur Twilio:', error);
                    return {
                        statusCode: 500,
                        headers: corsHeaders,
                        body: JSON.stringify({ 
                            error: 'Erreur lors de la mise à jour',
                            details: error.message
                        })
                    };
                }
            }

            // A ameliorer
            // Simple authentification
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Authentifié' })
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: error.message })
            };
        }
    }

    // Gestion GET
    if (event.requestContext.http.method === 'GET') {
        try {
            const phoneNumbersStr = await getSSMParameter('phone_numbers');
            const phoneNumbers = JSON.parse(phoneNumbersStr);

            return {
                statusCode: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(phoneNumbers)
            };
        } catch (error) {
            console.error('Erreur récupération numéros:', error);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Erreur lors de la récupération des numéros',
                    details: error.message 
                })
            };
        }
    }

    // Route non trouvée
    return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Route non trouvée' })
    };
}; 