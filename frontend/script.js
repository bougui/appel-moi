let currentPassword = '';

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

        phoneNumbers.forEach((phone) => {
            const option = document.createElement('option');
            option.value = JSON.stringify(phone);
            const smsIndicator = phone.sendSms ? '📱' : '🔕';
            option.textContent = `${phone.description} (${phone.number}) ${smsIndicator}`;
            select.appendChild(option);
        });

        console.log('Options créées:', select.innerHTML);
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('message').innerHTML = 
            `<p class="error">Erreur lors du chargement des numéros: ${error.message}</p>`;
    }
}

async function authenticate() {
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;
    const messageDiv = document.getElementById('message');

    try {
        const response = await fetch(`${API_URL}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: encodeURIComponent(username),
                password: encodeURIComponent(password)
            })
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.innerHTML = '';
            currentPassword = password;
            showPhoneNumbers();
        } else {
            messageDiv.innerHTML = `<p class="error">${data.error}</p>`;
        }
    } catch (error) {
        console.error('Erreur:', error);
        messageDiv.innerHTML = `<p class="error">Erreur de connexion</p>`;
    }
}

async function updateTransfer() {
    const selectedNumber = document.getElementById('phoneNumber').value;
    console.log('Tentative de transfert vers:', selectedNumber);

    try {
        const response = await fetch(`${API_URL}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: encodeURIComponent(currentPassword),
                phoneNumber: selectedNumber
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const messageDiv = document.getElementById('message');
        messageDiv.innerHTML = `
            <p style="color: #333;">
                ${result.message}
                ${result.smsSent ? '(SMS envoyé)' : ''}
            </p>
        `;

    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('message').innerHTML = 
            `<p class="error">Erreur lors du transfert: ${error.message}</p>`;
    }
}

async function showPhoneNumbers() {
    const phoneContainer = document.getElementById('phone-container');
    const messageDiv = document.getElementById('message');

    try {
        const response = await fetch(`${API_URL}/transfer`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const phoneNumbers = await response.json();
            phoneContainer.style.display = 'block';
            document.querySelector('.login-container').style.display = 'none';

            const select = document.getElementById('phoneNumber');
            select.innerHTML = '';
            
            phoneNumbers.forEach((phone) => {
                const option = document.createElement('option');
                option.value = JSON.stringify(phone);
                const smsIndicator = phone.sendSms ? '📱' : '🔕';
                option.textContent = `${phone.description} (${phone.number}) ${smsIndicator}`;
                select.appendChild(option);
            });
        } else {
            messageDiv.innerHTML = `<p class="error">Erreur lors du chargement des numéros</p>`;
        }
    } catch (error) {
        console.error('Erreur:', error);
        messageDiv.innerHTML = `<p class="error">Erreur de connexion</p>`;
    }
}

async function updatePhoneNumber() {
    const selectedPhone = document.getElementById('phoneNumber').value;
    const messageDiv = document.getElementById('message');

    try {
        const response = await fetch(`${API_URL}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: encodeURIComponent(document.getElementById('username').value),
                password: encodeURIComponent(currentPassword),
                phoneNumber: selectedPhone
            })
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.innerHTML = `<p style="color: #333;">${data.message}</p>`;
        } else {
            messageDiv.innerHTML = `<p class="error">${data.error}</p>`;
        }
    } catch (error) {
        console.error('Erreur:', error);
        messageDiv.innerHTML = `<p class="error">Erreur lors de la mise à jour</p>`;
    }
} 