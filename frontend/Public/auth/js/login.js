// Ensure services are loaded
if (typeof auth === 'undefined' || typeof api === 'undefined') {
  console.error('Services not loaded. Make sure config.js, utils.js, api.js, and auth.js are included before this script.');
}

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('error-msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    Toast.error('Please fill in all fields.');
    errorMsg.textContent = 'Please fill in all fields.';
    return;
  }

  // Validate email format
  if (!Utils.validateEmail(email)) {
    Toast.error('Please enter a valid email address.');
    errorMsg.textContent = 'Please enter a valid email address.';
    return;
  }

  // Validate password
  if (!Utils.validatePassword(password)) {
    Toast.error('Password must be at least 6 characters.');
    errorMsg.textContent = 'Password must be at least 6 characters.';
    return;
  }

  try {
    Utils.showLoading();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';

    // Use auth service to login
    const response = await auth.login(email, password);

    Utils.hideLoading();

    // Redirect based on user role
    setTimeout(() => {
      if (auth.isOrganizer()) {
        window.location.href = '../../Admin/pages/index.html';
      } else {
        window.location.href = '../../User/pages/index.html';
      }
    }, 500);

  } catch (error) {
    Utils.hideLoading();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
    
    errorMsg.textContent = `Error: ${error.message}`;
    console.error('Login error:', error);
  }
});
