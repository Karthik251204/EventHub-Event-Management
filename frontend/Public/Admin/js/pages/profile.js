// Remove imports and use global objects
// import { getUser, updateUser } from '../../js/services/auth.js';
// import { showToast } from '../../js/components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Table elements
  const userNameEl = document.getElementById('user-name');
  const userMobileEl = document.getElementById('user-mobile');
  const userEmailEl = document.getElementById('user-email');

  // Form elements
  const updateForm = document.getElementById('update-form');
  const mobileInput = document.getElementById('mobile');
  const emailInput = document.getElementById('email');

  // Check if user is logged in
  const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
  if (!token) {
    Toast.error('You must be logged in to view this page.');
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
    return;
  }

  // Fetch and display user data
  try {
    const user = auth.getCurrentUser();
    
    if (user) {
      // Populate the table
      userNameEl.textContent = user.name || 'N/A';
      userMobileEl.textContent = user.mobile || 'N/A';
      userEmailEl.textContent = user.email || 'N/A';

      // Populate the form
      mobileInput.value = user.mobile || '';
      emailInput.value = user.email || '';
    } else {
      Toast.error('Could not load user information.');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    Toast.error(`Error: ${error.message}`);
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  }

  // Handle profile update
  updateForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const updatedData = {
      mobile: mobileInput.value,
      email: emailInput.value,
    };

    try {
      // For now, just update localStorage since there's no updateUser method
      const currentUser = auth.getCurrentUser();
      const updatedUser = { ...currentUser, ...updatedData };
      localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(updatedUser));
      auth.user = updatedUser;
      Toast.success('Profile updated successfully!');

      // Update the table with the new data
      userNameEl.textContent = updatedUser.name || 'N/A';
      userMobileEl.textContent = updatedUser.mobile || 'N/A';
      userEmailEl.textContent = updatedUser.email || 'N/A';

      // Update form values
      mobileInput.value = updatedUser.mobile || '';
      emailInput.value = updatedUser.email || '';
      
    } catch (error) {
      console.error('Error updating profile:', error);
      Toast.error(`Failed to update profile: ${error.message}`);
    }
  });
});
