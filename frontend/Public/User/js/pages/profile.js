const API_BASE = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Profile Page Loaded. Fetching data...");
    fetchUserProfile();
    setupUpdateForm();
});

// 1. Fetch User Details from Database
async function fetchUserProfile() {
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('authToken') || 
                  localStorage.getItem('eventhub_token') ||
                  localStorage.getItem('auth_token') ||
                  (typeof CONFIG !== 'undefined' && CONFIG.STORAGE ? localStorage.getItem(CONFIG.STORAGE.TOKEN) : null);
    
    if (!token || token === 'null' || token === 'undefined') {
        console.error("No token found in localStorage");
        window.location.href = '/Public/auth/pages/login.html'; 
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Response Status:", response.status);

        if (response.ok) {
            const user = await response.json();
            console.log("User Data Received:", user); // Check your console (F12) to see the keys

            // Update the UI Text (Display)
            // Added fallbacks in case your backend uses different names like 'name' or 'full_name'
            document.getElementById('user-name').textContent = user.username || user.name || user.full_name || 'N/A';
            document.getElementById('user-mobile').textContent = user.mobile || user.phone || 'Not set';
            document.getElementById('user-email').textContent = user.email || 'N/A';
            document.getElementById('user-category').textContent = user.role || 'User';

            // Pre-fill the Form Inputs
            document.getElementById('mobile').value = user.mobile || user.phone || '';
            document.getElementById('email').value = user.email || '';
            
            lucide.createIcons();
        } else {
            try {
                const errorData = await response.json();
                console.error("Backend Error:", errorData);
            } catch (e) {
                console.error("Backend Error (Non-JSON):", response.status, response.statusText);
            }
            // If unauthorized, go back to login
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                window.location.href = '/Public/auth/pages/login.html';
            }
        }
    } catch (error) {
        console.error("Connection Error:", error);
        document.getElementById('user-category').textContent = "OFFLINE";
        showModal("Connection Error", "Could not connect to the backend server at " + API_BASE);
    }
}

// 2. Handle Profile Update
function setupUpdateForm() {
    const form = document.getElementById('update-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token') || 
                      localStorage.getItem('authToken') || 
                      localStorage.getItem('eventhub_token') ||
                      localStorage.getItem('auth_token') ||
                      (typeof CONFIG !== 'undefined' && CONFIG.STORAGE ? localStorage.getItem(CONFIG.STORAGE.TOKEN) : null);
        
        const updatedData = {
            mobile: document.getElementById('mobile').value,
            email: document.getElementById('email').value
        };

        try {
            const response = await fetch(`${API_BASE}/auth/update-profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                showModal("Success", "Your profile has been updated successfully.");
                fetchUserProfile(); 
            } else {
                let errorMsg = "Something went wrong.";
                try {
                    const error = await response.json();
                    errorMsg = error.message || errorMsg;
                } catch (e) {
                    errorMsg = `Server Error: ${response.status}`;
                }
                showModal("Update Failed", errorMsg);
            }
        } catch (error) {
            showModal("Error", "Connection lost. Please try again.");
        }
    });
}

// 3. Modal Helper
function showModal(title, message) {
    const modal = document.getElementById('modal');
    if (!modal) {
        alert(title + ": " + message);
        return;
    }
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    
    modal.style.display = 'flex';
    
    document.getElementById('modal-confirm').onclick = () => {
        modal.style.display = 'none';
    };
}