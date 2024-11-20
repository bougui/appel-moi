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
    console.log('Méthode:', event.requestContext.http.method);

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': '*'
    };

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
            const storedPassword = await getSSMParameter('app_password');
            const decodedPassword = decodeURIComponent(body.password || '');

            if (decodedPassword !== storedPassword) {
                console.warn('Mot de passe invalide');
                return {
                    statusCode: 401,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Non autorisé' })
                };
            }

            // Demande de transfert
            if (body.phoneNumber) {
                console.log('Transfert demandé vers:', body.phoneNumber);
                
                try {
                    const accountSid = await getSSMParameter('twilio_account_sid');
                    const authToken = await getSSMParameter('twilio_auth_token');
                    const twilioNumber = await getSSMParameter('twilio_number');
                    const workflowSid = await getSSMParameter('twilio_workflow_sid');
                    const client = twilio(accountSid, authToken);

                    // Mise à jour du workflow
                    await client.studio.v2
                        .flows(workflowSid)
                        .update({
                            status: 'published',
                            parameters: {
                                forward_to: body.phoneNumber
                            }
                        });

                    // Envoi du SMS de confirmation
                    await client.messages.create({
                        body: "Ton numéro est associé au camp Paul B",
                        from: twilioNumber,
                        to: body.phoneNumber
                    });

                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({ 
                            message: 'Workflow mis à jour et SMS envoyé',
                            phoneNumber: body.phoneNumber
                        })
                    };
                } catch (error) {
                    console.error('Erreur Twilio:', error);
                    return {
                        statusCode: 500,
                        headers: corsHeaders,
                        body: JSON.stringify({ 
                            error: 'Erreur lors de la mise à jour chez twilio',
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
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: phoneNumbersStr
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: error.message })
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