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
    console.log('=== NOUVELLE REQUÊTE ===');
    console.log('Méthode:', event.requestContext.http.method);
    console.log('Body:', event.body);

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': '*'
    };

    // Gestion OPTIONS
    if (event.requestContext.http.method === 'OPTIONS') {
        console.log('Traitement OPTIONS');
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        // Gestion GET
        if (event.requestContext.http.method === 'GET') {
            console.log('Traitement GET - récupération des numéros');
            try {
                const phoneNumbersStr = await getSSMParameter('phone_numbers');
                console.log('Numéros récupérés (brut):', phoneNumbersStr);
                
                // S'assurer que c'est un JSON valide
                const phoneNumbers = JSON.parse(phoneNumbersStr);
                console.log('Numéros parsés:', phoneNumbers);

                return {
                    statusCode: 200,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(phoneNumbers)  // Re-stringify pour s'assurer du format
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

        // Gestion POST
        if (event.requestContext.http.method === 'POST') {
            try {
                const body = JSON.parse(event.body || '{}');
                console.log('Body parsé:', body);

                // Si on a un numéro, c'est une demande de transfert
                if (body.phoneNumber) {
                    console.log('=== DEMANDE DE TRANSFERT ===');
                    console.log('Numéro choisi:', body.phoneNumber);
                    
                    // Vérifier le mot de passe d'abord
                    const storedPassword = await getSSMParameter('app_password');
                    if (decodeURIComponent(body.password) !== storedPassword) {
                        console.warn('Mot de passe invalide pour le transfert');
                        return {
                            statusCode: 401,
                            headers: corsHeaders,
                            body: JSON.stringify({ error: 'Non autorisé' })
                        };
                    }

                    // Vérifier si le numéro est autorisé
                    const phoneNumbersStr = await getSSMParameter('phone_numbers');
                    const authorizedNumbers = JSON.parse(phoneNumbersStr);
                    
                    if (!authorizedNumbers.includes(body.phoneNumber)) {
                        console.warn('Numéro non autorisé:', body.phoneNumber);
                        return {
                            statusCode: 400,
                            headers: corsHeaders,
                            body: JSON.stringify({ error: 'Numéro non autorisé' })
                        };
                    }

                    console.log('SIMULATION: Mise à jour Twilio avec le numéro', body.phoneNumber);
                    
                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({ 
                            message: 'Simulation de transfert réussie',
                            phoneNumber: body.phoneNumber
                        })
                    };
                }

                // Si on arrive ici, c'est juste une vérification de mot de passe
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Authentifié avec succès' })
                };

            } catch (error) {
                console.error('Erreur POST:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({ 
                        error: 'Erreur serveur',
                        details: error.message 
                    })
                };
            }
        }

        // Si on arrive ici, la méthode n'est pas supportée
        console.warn(`Méthode non supportée: ${event.requestContext.http.method}`);
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Méthode non supportée',
                method: event.requestContext.http.method,
                supportedMethods: ['GET', 'POST', 'OPTIONS']
            })
        };

    } catch (error) {
        console.error('Erreur générale:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Erreur serveur',
                details: error.message 
            })
        };
    }
}; 