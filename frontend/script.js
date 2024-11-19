let currentPassword = '';
const API_URL = 'VOTRE_API_GATEWAY_URL';

async function loadPhoneNumbers() {
    try {
        const response = await fetch(API_URL, {
            method: 'GET'
        });
        const phoneNumbers = await response.json();
        const select = document.getElementById('phoneNumber');
        select.innerHTML = '';
        
        JSON.parse(phoneNumbers).forEach((number, index) => {
            const option = document.createElement('option');
            option.value = number;
            option.textContent = `Numéro ${index + 1}: ${number}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des numéros:', error);
    }
}

function authenticate() {
    const password = document.getElementById('password').value;
    currentPassword = password;
    
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('transferForm').style.display = 'block';
    loadPhoneNumbers();
}

async function updateTransfer() {
    const phoneNumber = document.getElementById('phoneNumber').value;
    const messageDiv = document.getElementById('message');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: currentPassword,
                phoneNumber: phoneNumber
            })
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.innerHTML = `<p class="success">${data.message}</p>`;
        } else {
            messageDiv.innerHTML = `<p class="error">${data.error}</p>`;
            if (response.status === 401) {
                document.getElementById('loginForm').style.display = 'block';
                document.getElementById('transferForm').style.display = 'none';
            }
        }
    } catch (error) {
        messageDiv.innerHTML = `<p class="error">Erreur de connexion au serveur</p>`;
    }
} 