let currentPassword = '';
const VALID_USERNAME = 'rosaire'; // Username hardcodé
const API_URL = 'https://3k2dleqmv3.execute-api.ca-central-1.amazonaws.com';

async function loadPhoneNumbers() {
    try {
        const response = await fetch(`${API_URL}/transfer`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const phoneNumbers = await response.json();
        console.log('Numéros reçus:', phoneNumbers);

        const select = document.getElementById('phoneNumber');
        select.innerHTML = '';
        
        if (!Array.isArray(phoneNumbers)) {
            throw new Error('Format de numéros invalide');
        }

        phoneNumbers.forEach((number, index) => {
            const option = document.createElement('option');
            option.value = number;
            option.textContent = `Numéro ${index + 1}: ${number}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('message').innerHTML = 
            `<p class="error">Erreur lors du chargement des numéros: ${error.message}</p>`;
    }
}

async function authenticate() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');
    
    if (username.toLowerCase() !== VALID_USERNAME) {
        messageDiv.innerHTML = `<p class="error">Nom d'usager invalide</p>`;
        return;
    }
    
    // Tester le mot de passe avec l'API
    try {
        const response = await fetch(`${API_URL}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: encodeURIComponent(password)
            })
        });

        if (response.status === 401) {
            messageDiv.innerHTML = `<p class="error">Mot de passe invalide</p>`;
            return;
        }

        if (!response.ok) {
            messageDiv.innerHTML = `<p class="error">Erreur lors de la connexion</p>`;
            return;
        }

        // Si on arrive ici, l'authentification est réussie
        currentPassword = password;
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('transferForm').style.display = 'block';
        loadPhoneNumbers();
        messageDiv.innerHTML = ''; // Effacer les messages d'erreur

    } catch (error) {
        console.error('Erreur:', error);
        messageDiv.innerHTML = `<p class="error">Erreur de connexion au serveur</p>`;
    }
}

async function updatePhoneNumber() {
    const selectedNumber = document.getElementById('phoneNumber').value;
    console.log('Tentative de transfert vers:', selectedNumber);

    try {
        const response = await fetch(`${API_URL}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: encodeURIComponent(currentPassword),  // Utiliser le mot de passe stocké
                phoneNumber: selectedNumber
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        document.getElementById('message').innerHTML = 
            `<p class="success">Transfert configuré vers ${selectedNumber}</p>`;

    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('message').innerHTML = 
            `<p class="error">Erreur lors du transfert: ${error.message}</p>`;
    }
} 