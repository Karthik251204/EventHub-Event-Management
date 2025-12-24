// Ensure services are loaded
if (typeof auth === 'undefined' || typeof api === 'undefined') {
  console.error('Services not loaded. Make sure config.js, utils.js, api.js, and auth.js are included before this script.');
}

const form = document.getElementById('signup-form');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const errorMsg = document.getElementById('error-msg');
const successMsg = document.getElementById('success-msg');

// Submit signup form
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';
  successMsg.textContent = '';

  // Get form values
  const name = document.getElementById('name').value.trim();
  const mobile = document.getElementById('mobile').value.trim();
  const role = document.getElementById('role').value;
  const email = document.getElementById('email').value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Validate passwords match
  if (password !== confirmPassword) {
    Toast.error('Passwords do not match.');
    errorMsg.textContent = 'Passwords do not match.';
    return;
  }

  // Validate password length
  if (!Utils.validatePassword(password)) {
    Toast.error('Password must be at least 6 characters.');
    errorMsg.textContent = 'Password must be at least 6 characters.';
    return;
  }

  // Validate email format
  if (!Utils.validateEmail(email)) {
    Toast.error('Please enter a valid email address.');
    errorMsg.textContent = 'Please enter a valid email address (e.g., user@example.com)';
    return;
  }

  // Validate mobile format
  if (!Utils.validateMobile(mobile)) {
    Toast.error('Please enter a valid 10-digit mobile number.');
    errorMsg.textContent = 'Please enter a valid 10-digit mobile number';
    return;
  }

  // Validate name
  if (!Utils.validateName(name)) {
    Toast.error('Please enter a valid name (at least 2 characters).');
    errorMsg.textContent = 'Please enter a valid name.';
    return;
  }

  // Validate role
  if (!role) {
    Toast.error('Please select a role.');
    errorMsg.textContent = 'Please select a role.';
    return;
  }

  try {
    Utils.showLoading();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';

    // Use auth service to signup
    const response = await auth.signup({
      name,
      mobile,
      role,
      email,
      password,
      confirmPassword
    });

    Utils.hideLoading();
    successMsg.textContent = '✓ Account created successfully! Redirecting...';

    setTimeout(() => {
      // Redirect based on role
      if (auth.isOrganizer()) {
        window.location.href = '../../Admin/pages/index.html';
        // Utils.redirect(CONFIG.PAGES.ADMIN);
      } else {
        window.location.href = '../../User/pages/index.html';
      }
    }, 1000);

  } catch (error) {
    Utils.hideLoading();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
    
    errorMsg.textContent = `Error: ${error.message}`;
    console.error('Signup error:', error);
  }
});
