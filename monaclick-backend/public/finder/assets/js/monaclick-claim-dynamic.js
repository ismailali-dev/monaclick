(() => {
  const path = window.location.pathname;
  if (!path.startsWith('/claim/')) return;

  const moduleFromPath = path.split('/')[2] || '';
  const allowedModules = new Set(['contractors', 'restaurants', 'real-estate', 'cars']);
  if (!allowedModules.has(moduleFromPath)) return;

  const params = new URLSearchParams(window.location.search);
  const slug = String(params.get('slug') || '').trim();
  const csrfToken = window.__MC_CSRF__ || '';

  const titleNode = document.getElementById('claimPageTitle');
  const textNode = document.getElementById('claimPageText');
  const alertNode = document.getElementById('claimAlert');
  const listingLoading = document.getElementById('claimListingLoading');
  const listingSummary = document.getElementById('claimListingSummary');
  const listingModule = document.getElementById('claimListingModule');
  const listingName = document.getElementById('claimListingName');
  const emailForm = document.getElementById('claimEmailForm');
  const emailInput = document.getElementById('claimEmail');
  const otpForm = document.getElementById('claimOtpForm');
  const otpInput = document.getElementById('claimOtp');
  const resendBtn = document.getElementById('claimResendBtn');
  const completePanel = document.getElementById('claimCompletePanel');
  const completeBtn = document.getElementById('claimCompleteBtn');
  const passwordInput = document.getElementById('claimPassword');
  const passwordConfirmInput = document.getElementById('claimPasswordConfirm');
  const passwordToggleButtons = Array.from(document.querySelectorAll('[data-password-toggle]'));
  const state = {
    email: '',
    claimToken: '',
    detailUrl: '',
  };

  const hideGlobalLoader = () => {
    if (typeof window.__MC_HIDE_PAGE_LOADER__ === 'function') {
      window.__MC_HIDE_PAGE_LOADER__();
    }
  };

  const escapeHtml = (value) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const moduleLabel = (value) => ({
    contractors: 'Contractors',
    restaurants: 'Restaurants',
    'real-estate': 'Real Estate',
    cars: 'Cars',
  }[value] || 'Business');

  const showAlert = (message, type = 'danger') => {
    hideGlobalLoader();
    if (!alertNode) return;
    alertNode.innerHTML = message
      ? `<div class="alert alert-${escapeHtml(type)} mb-4">${escapeHtml(message)}</div>`
      : '';
  };

  const setLoading = (button, isLoading, label) => {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalLabel = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>${escapeHtml(label)}`;
      return;
    }
    hideGlobalLoader();
    button.disabled = false;
    if (button.dataset.originalLabel) {
      button.innerHTML = button.dataset.originalLabel;
      delete button.dataset.originalLabel;
    }
  };

  const postJson = async (url, payload) => {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRF-TOKEN': csrfToken,
      },
      body: JSON.stringify(payload || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(String(data?.message || 'Request failed.'));
    return data;
  };

  const fillListing = (listing) => {
    hideGlobalLoader();
    if (listingLoading) listingLoading.classList.add('d-none');
    if (listingSummary) listingSummary.classList.remove('d-none');
    if (listingModule) listingModule.textContent = moduleLabel(listing.module || moduleFromPath);
    if (listingName) listingName.textContent = listing.title || 'Business';
    const prefillEmail = String(listing?.claim?.email || listing?.claim_email || '').trim().toLowerCase();
    if (prefillEmail && emailInput && !emailInput.value) {
      emailInput.value = prefillEmail;
      state.email = prefillEmail;
    }
    if (emailInput) {
      emailInput.readOnly = prefillEmail !== '';
      emailInput.setAttribute('aria-readonly', prefillEmail !== '' ? 'true' : 'false');
    }
    if (titleNode) titleNode.textContent = `Claim ${listing.title || 'your business'}`;
    if (textNode) {
      textNode.textContent = 'Enter your email to claim your business. We will send a 6-digit OTP to verify your email.';
    }
    state.detailUrl = String(listing?.slug ? `/entry/${encodeURIComponent(listing.module || moduleFromPath)}?slug=${encodeURIComponent(listing.slug)}` : '');
    document.title = `Monaclick | Claim ${listing.title || 'Business'}`;
  };

  const showUnavailable = (message) => {
    hideGlobalLoader();
    if (listingLoading) listingLoading.classList.add('d-none');
    if (emailForm) emailForm.classList.add('d-none');
    if (otpForm) otpForm.classList.add('d-none');
    if (completePanel) completePanel.classList.add('d-none');
    showAlert(message || 'This profile is not available for claim right now.');
  };

  const goToOtpStep = () => {
    if (emailForm) emailForm.classList.add('d-none');
    if (otpForm) otpForm.classList.remove('d-none');
    if (completePanel) completePanel.classList.add('d-none');
    if (otpInput) otpInput.focus();
  };

  const goToCompleteStep = () => {
    showAlert('');
    if (otpForm) otpForm.classList.add('d-none');
    if (completePanel) completePanel.classList.remove('d-none');
    if (passwordInput) passwordInput.focus();
  };

  passwordToggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const inputId = String(button.getAttribute('data-password-toggle') || '').trim();
      if (!inputId) return;
      const input = document.getElementById(inputId);
      if (!(input instanceof HTMLInputElement)) return;

      const nextType = input.type === 'password' ? 'text' : 'password';
      input.type = nextType;

      const icon = button.querySelector('i');
      if (icon) {
        icon.className = nextType === 'text' ? 'fi-eye-off' : 'fi-eye';
      }

      const isVisible = nextType === 'text';
      button.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
      button.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
    });
  });

  if (otpInput) {
    otpInput.addEventListener('input', () => {
      otpInput.value = String(otpInput.value || '').replace(/\D+/g, '').slice(0, 6);
    });
  }

  emailForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideGlobalLoader();
    showAlert('');

    const email = String(emailInput?.value || '').trim().toLowerCase();
    if (!emailInput || !emailInput.checkValidity()) {
      emailForm.classList.add('was-validated');
      return;
    }

    const submitBtn = emailForm.querySelector('button[type="submit"]');
    setLoading(submitBtn, true, 'Sending OTP...');
    try {
      await postJson(`/api/monaclick/claims/${encodeURIComponent(slug)}/request-otp`, { email });
      state.email = email;
      showAlert('We sent a 6-digit OTP to your email address.', 'success');
      goToOtpStep();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(submitBtn, false);
    }
  });

  otpForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideGlobalLoader();
    showAlert('');

    const code = String(otpInput?.value || '').trim();
    if (!otpInput || code.length !== 6) {
      otpForm.classList.add('was-validated');
      return;
    }

    const submitBtn = otpForm.querySelector('button[type="submit"]');
    setLoading(submitBtn, true, 'Verifying...');
    try {
      const payload = await postJson(`/api/monaclick/claims/${encodeURIComponent(slug)}/verify-otp`, {
        email: state.email,
        code,
      });
      state.claimToken = String(payload?.claim_token || '');
      goToCompleteStep();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(submitBtn, false);
    }
  });

  resendBtn?.addEventListener('click', async () => {
    hideGlobalLoader();
    if (!state.email) {
      showAlert('Please enter your email first.');
      return;
    }
    setLoading(resendBtn, true, 'Sending...');
    showAlert('');
    try {
      await postJson(`/api/monaclick/claims/${encodeURIComponent(slug)}/request-otp`, {
        email: state.email,
      });
      showAlert('A new OTP has been sent to your email.', 'success');
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(resendBtn, false);
    }
  });

  completeBtn?.addEventListener('click', async () => {
    hideGlobalLoader();
    if (!state.email || !state.claimToken) {
      showAlert('Your claim session expired. Please verify OTP again.');
      return;
    }
    const password = String(passwordInput?.value || '');
    const passwordConfirmation = String(passwordConfirmInput?.value || '');
    if (password.length < 8) {
      showAlert('Password must be at least 8 characters.');
      passwordInput?.focus();
      return;
    }
    if (password !== passwordConfirmation) {
      showAlert('Password confirmation does not match.');
      passwordConfirmInput?.focus();
      return;
    }
    setLoading(completeBtn, true, 'Claiming...');
    showAlert('');
    try {
      await postJson(`/api/monaclick/claims/${encodeURIComponent(slug)}/complete`, {
        email: state.email,
        claim_token: state.claimToken,
        password,
        password_confirmation: passwordConfirmation,
      });
      window.location.href = state.detailUrl || `/entry/${encodeURIComponent(moduleFromPath)}?slug=${encodeURIComponent(slug)}`;
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(completeBtn, false);
    }
  });

  if (!slug) {
    showUnavailable('Listing slug is missing.');
    return;
  }

  hideGlobalLoader();

  fetch(`/api/monaclick/entry?module=${encodeURIComponent(moduleFromPath)}&slug=${encodeURIComponent(slug)}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
    .then((response) => {
      if (!response.ok) throw new Error('Unable to load listing.');
      return response.json();
    })
    .then((payload) => {
      const listing = payload?.data;
      if (!listing) throw new Error('Listing data not found.');
      fillListing(listing);
      if (!listing?.claim?.eligible) {
        showUnavailable('This profile cannot be claimed right now.');
      }
    })
    .catch((error) => {
      showUnavailable(error.message || 'Unable to load listing.');
    });
})();
