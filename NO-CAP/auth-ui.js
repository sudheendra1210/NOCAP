import { clerk, getClerkSettings, initializeClerk } from "./auth.js";

const landingUrl = () => {
  const url = new URL(window.location.href);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("__clerk_")) url.searchParams.delete(key);
  }
  return url.href;
};

const clerkMessage = (error, fallback) => {
  const messages = error?.errors
    ?.map((item) => item.longMessage || item.message)
    .filter(Boolean);

  return messages?.join(" ") || error?.message || fallback;
};

export async function initializeAuthUI() {
  await initializeClerk();

  const dialog = document.querySelector("#auth-dialog");
  const loginButton = document.querySelector("#auth-open");
  const profileControl = document.querySelector("#auth-profile-control");
  const profileButton = document.querySelector("#auth-profile");
  const profileDropdown = document.querySelector("#auth-profile-dropdown");
  const profileIdentity = document.querySelector("#auth-profile-identity");
  const profileEmail = document.querySelector("#auth-profile-email");
  const signOutButton = document.querySelector("#auth-sign-out");
  const closeButton = document.querySelector("#auth-close");
  const title = document.querySelector("#auth-title");
  const message = document.querySelector("#auth-message");
  const views = [...document.querySelectorAll("[data-auth-view]")];
  const googleButtons = [...document.querySelectorAll("[data-auth-google]")];
  const googleDividers = [...document.querySelectorAll("[data-auth-google-divider]")];
  const signUpUsername = document.querySelector("#sign-up-username");
  const signUpEmail = document.querySelector("#sign-up-email");
  const signUpPassword = document.querySelector("#sign-up-password");
  const signUpConfirmPassword = document.querySelector("#sign-up-confirm-password");
  const verifyEmailForm = document.querySelector("#verify-email-form");
  const verifyDescription = document.querySelector("#verify-email-description");
  const resendVerification = document.querySelector("#resend-verification");
  const resetPassword = document.querySelector("#reset-password");
  const resetConfirmPassword = document.querySelector("#reset-confirm-password");
  const resetEmail = document.querySelector("#reset-email");
  const oauthSignUpForm = document.querySelector("#oauth-sign-up-form");
  const oauthSignUpUsername = document.querySelector("#oauth-sign-up-username");

  // Clerk's loaded environment reflects this instance's dashboard configuration.
  const settings = getClerkSettings();
  const usernameSetting = settings?.attributes?.username;
  const usernameEnabled = Boolean(usernameSetting?.enabled);
  const googleEnabled = Boolean(settings?.social?.oauth_google?.enabled);
  const emailVerificationStrategies = settings?.attributes?.email_address?.verifications ?? [];
  const emailVerificationStrategy = emailVerificationStrategies.includes("email_code")
    ? "email_code"
    : emailVerificationStrategies.includes("email_link")
      ? "email_link"
      : null;
  const minimumPasswordLength = settings?.passwordSettings?.min_length || 8;

  let currentSignUp = null;
  let pendingOAuthSignUp = null;
  let pendingEmailPasswordSignUp = null;
  let currentEmailStrategy = "email_code";

  for (const button of googleButtons) button.hidden = !googleEnabled;
  for (const divider of googleDividers) divider.hidden = !googleEnabled;

  const titles = {
    "sign-in": "BACK IN THE CIRCLE.",
    "sign-up": "ENTER THE CULTURE.",
    "oauth-sign-up": "ENTER THE CULTURE.",
    "verify-email": "CHECK YOUR INBOX.",
    "reset-request": "RESET YOUR PASSWORD.",
    "reset-code": "RESET YOUR PASSWORD.",
  };

  function showMessage(text = "", state = "") {
    message.textContent = text;
    message.dataset.state = state;
    message.setAttribute("role", state === "error" ? "alert" : "status");
    message.hidden = !text;
  }

  function showView(viewName) {
    for (const view of views) view.hidden = view.dataset.authView !== viewName;
    title.textContent = titles[viewName] || titles["sign-in"];
    showMessage();
  }

  function setProfileMenuOpen(open) {
    const shouldOpen = Boolean(open && !profileControl.hidden);
    profileDropdown.hidden = !shouldOpen;
    profileButton.setAttribute("aria-expanded", String(shouldOpen));
  }

  function renderHeader(state = {}) {
    const session = Object.prototype.hasOwnProperty.call(state, "session") ? state.session : clerk.session;
    if (session === undefined) return;

    const user = Object.prototype.hasOwnProperty.call(state, "user") ? state.user : clerk.user;
    const signedIn = session !== null;
    loginButton.hidden = signedIn;
    profileControl.hidden = !signedIn;
    if (!signedIn) setProfileMenuOpen(false);

    profileIdentity.textContent = user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress || "NO CAP member";
    const email = user?.primaryEmailAddress?.emailAddress || "";
    profileEmail.textContent = email;
    profileEmail.hidden = !email;
  }

  function finishOnLanding() {
    renderHeader();
    if (dialog.open) dialog.close();
    history.replaceState(null, "", landingUrl());
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (clerk.session) profileButton.focus();
  }

  async function activateSession(sessionId) {
    if (!sessionId) throw new Error("Authentication completed without an active session. Please try again.");
    await clerk.setActive({ session: sessionId });
    finishOnLanding();
  }

  function setBusy(form, busy, buttonText) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    if (busy) {
      button.dataset.idleLabel = button.textContent;
      button.textContent = buttonText;
    } else {
      button.textContent = button.dataset.idleLabel || button.textContent;
      delete button.dataset.idleLabel;
    }
    button.disabled = busy;
    form.setAttribute("aria-busy", String(busy));
  }

  function passwordsAreValid(passwordInput, confirmationInput) {
    passwordInput.setCustomValidity(
      passwordInput.value && passwordInput.value.length < minimumPasswordLength
        ? `Use at least ${minimumPasswordLength} characters.`
        : "",
    );
    confirmationInput.setCustomValidity(
      confirmationInput.value && confirmationInput.value !== passwordInput.value
        ? "The passwords do not match."
        : "",
    );
    return passwordInput.checkValidity() && confirmationInput.checkValidity();
  }

  async function beginEmailVerification(signUp) {
    if (!emailVerificationStrategy) {
      throw new Error("Email verification is not enabled for this Clerk application. Enable email verification in Clerk settings, then try again.");
    }

    currentSignUp = signUp;
    currentEmailStrategy = emailVerificationStrategy;

    if (emailVerificationStrategy === "email_code") {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      verifyEmailForm.hidden = false;
      verifyDescription.textContent = `Enter the verification code sent to ${signUp.emailAddress || signUpEmail.value}.`;
      resendVerification.hidden = false;
      showView("verify-email");
      document.querySelector("#verify-email-code").focus();
      return;
    }

    const { startEmailLinkFlow } = signUp.createEmailLinkFlow();
    await startEmailLinkFlow({ redirectUrl: landingUrl() });
    verifyEmailForm.hidden = true;
    verifyDescription.textContent = `We sent a verification link to ${signUp.emailAddress || signUpEmail.value}. Open it to finish creating your account.`;
    resendVerification.hidden = true;
    showView("verify-email");
  }

  async function continueEmailPasswordSignUp(signUp) {
    let result = signUp;
    currentSignUp = result;

    if (result.status === "complete") {
      await activateSession(result.createdSessionId);
      return;
    }

    if (result.unverifiedFields?.includes("email_address") || result.missingFields?.includes("email_address")) {
      await beginEmailVerification(result);
      return;
    }

    if (result.missingFields?.includes("username")) {
      const username = result.username || signUpUsername.value.trim();
      if (!username) {
        pendingEmailPasswordSignUp = result;
        oauthSignUpUsername.value = "";
        showView("oauth-sign-up");
        showMessage("Your email is verified. Choose a username to finish creating your account.", "success");
        if (!dialog.open) dialog.showModal();
        oauthSignUpUsername.focus();
        return;
      }
      result = await result.update({ username });
      currentSignUp = result;
    }

    if (result.status === "complete") {
      await activateSession(result.createdSessionId);
      return;
    }

    if (result.unverifiedFields?.includes("email_address") || result.missingFields?.includes("email_address")) {
      await beginEmailVerification(result);
      return;
    }

    const missing = result.missingFields?.join(", ");
    throw new Error(missing
      ? `Your signup still needs: ${missing}. Add the required field to the signup form or update the Clerk signup settings.`
      : "Your signup needs another step that this screen does not support yet. Check the required fields in Clerk signup settings.");
  }

  async function continueOAuthSignUp(signUp) {
    const missingFields = signUp.missingFields ?? [];
    if (missingFields.length === 1 && missingFields[0] === "username" && usernameEnabled) {
      pendingOAuthSignUp = signUp;
      showView("oauth-sign-up");
      dialog.showModal();
      oauthSignUpUsername.focus();
      return;
    }

    if (signUp.unverifiedFields?.includes("email_address")) {
      await beginEmailVerification(signUp);
      dialog.showModal();
      return;
    }

    showView("sign-up");
    dialog.showModal();
    const missing = missingFields.join(", ");
    showMessage(missing
      ? `Google signup needs additional information: ${missing}. Update the Clerk signup settings or add those fields.`
      : "Google signup needs another step that this screen does not support yet. Check your Clerk signup settings.", "error");
  }

  loginButton.addEventListener("click", () => {
    showView("sign-in");
    dialog.showModal();
    document.querySelector("#sign-in-email").focus();
  });

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  for (const link of document.querySelectorAll("[data-auth-view-link]")) {
    link.addEventListener("click", () => showView(link.dataset.authViewLink));
  }

  profileButton.addEventListener("click", () => {
    const shouldOpen = profileDropdown.hidden;
    setProfileMenuOpen(shouldOpen);
    if (shouldOpen) signOutButton.focus();
  });

  document.addEventListener("click", (event) => {
    if (!profileControl.contains(event.target)) setProfileMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !profileDropdown.hidden) {
      setProfileMenuOpen(false);
      profileButton.focus();
    }
  });

  signOutButton.addEventListener("click", async () => {
    signOutButton.disabled = true;
    try {
      await clerk.signOut();
      setProfileMenuOpen(false);
      loginButton.focus();
    } catch (error) {
      if (!dialog.open) dialog.showModal();
      showMessage(clerkMessage(error, "We couldn’t sign you out. Please try again."), "error");
    } finally {
      signOutButton.disabled = false;
    }
  });

  for (const button of googleButtons) {
    button.addEventListener("click", async () => {
      const resource = button.closest('[data-auth-view="sign-up"]') ? clerk.client.signUp : clerk.client.signIn;
      button.disabled = true;
      button.textContent = "CONNECTING...";
      try {
        await resource.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: landingUrl(),
          redirectUrlComplete: landingUrl(),
        });
      } catch (error) {
        showMessage(clerkMessage(error, "Google sign-in could not be started."), "error");
        button.disabled = false;
        button.textContent = "Continue with Google";
      }
    });
  }

  const signInForm = document.querySelector("#sign-in-form");
  signInForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!signInForm.reportValidity()) return;
    setBusy(signInForm, true, "CHECKING...");
    showMessage();
    try {
      const result = await clerk.client.signIn.create({
        strategy: "password",
        identifier: document.querySelector("#sign-in-email").value.trim(),
        password: document.querySelector("#sign-in-password").value,
      });

      if (result.status === "complete") {
        await activateSession(result.createdSessionId);
      } else if (result.status === "needs_second_factor") {
        showMessage("This account needs an additional verification step. Contact the site team to finish signing in.", "error");
      } else {
        showMessage("Clerk needs another sign-in step that this screen does not support yet. Check your sign-in settings.", "error");
      }
    } catch (error) {
      showMessage(clerkMessage(error, "We couldn’t log you in. Check your email and password."), "error");
    } finally {
      setBusy(signInForm, false);
    }
  });

  const signUpForm = document.querySelector("#sign-up-form");
  signUpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!passwordsAreValid(signUpPassword, signUpConfirmPassword)) {
      signUpPassword.reportValidity();
      signUpConfirmPassword.reportValidity();
      return;
    }
    signUpUsername.setCustomValidity(signUpUsername.value.trim() ? "" : "Enter a username.");
    if (!signUpForm.reportValidity()) return;

    setBusy(signUpForm, true, "CREATING...");
    showMessage();
    try {
      const params = {
        username: signUpUsername.value.trim(),
        emailAddress: signUpEmail.value.trim(),
        password: signUpPassword.value,
      };

      const signUp = await clerk.client.signUp.create(params);
      currentSignUp = signUp;
      await continueEmailPasswordSignUp(signUp);
    } catch (error) {
      showMessage(clerkMessage(error, "We couldn’t create your account. Check the details and try again."), "error");
    } finally {
      setBusy(signUpForm, false);
    }
  });

  signUpUsername.addEventListener("input", () => {
    signUpUsername.setCustomValidity(signUpUsername.value.trim() ? "" : "Enter a username.");
  });
  signUpPassword.addEventListener("input", () => signUpPassword.setCustomValidity(""));
  signUpConfirmPassword.addEventListener("input", () => signUpConfirmPassword.setCustomValidity(""));
  resetPassword.addEventListener("input", () => resetPassword.setCustomValidity(""));
  resetConfirmPassword.addEventListener("input", () => resetConfirmPassword.setCustomValidity(""));

  oauthSignUpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const isOAuthSignUp = Boolean(pendingOAuthSignUp);
    const signUpToContinue = pendingOAuthSignUp || pendingEmailPasswordSignUp;
    if (!oauthSignUpForm.reportValidity() || !signUpToContinue) return;
    setBusy(oauthSignUpForm, true, "SAVING...");
    showMessage();
    try {
      const signUp = await signUpToContinue.update({ username: oauthSignUpUsername.value.trim() });
      if (isOAuthSignUp) {
        pendingOAuthSignUp = signUp;
        if (signUp.status === "complete") {
          await activateSession(signUp.createdSessionId);
        } else if (signUp.unverifiedFields?.includes("email_address")) {
          await beginEmailVerification(signUp);
        } else {
          const missing = signUp.missingFields?.join(", ");
          throw new Error(missing
            ? `Google signup still needs: ${missing}. Update the Clerk signup settings or add those fields.`
            : "Google signup needs another step that this screen does not support yet.");
        }
      } else {
        pendingEmailPasswordSignUp = null;
        currentSignUp = signUp;
        await continueEmailPasswordSignUp(signUp);
      }
    } catch (error) {
      showMessage(clerkMessage(error, isOAuthSignUp
        ? "We couldn’t finish Google signup. Please try again."
        : "We couldn’t finish creating your account. Please try again."), "error");
    } finally {
      setBusy(oauthSignUpForm, false);
    }
  });

  verifyEmailForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!verifyEmailForm.reportValidity()) return;
    setBusy(verifyEmailForm, true, "VERIFYING...");
    showMessage();
    try {
      if (currentEmailStrategy !== "email_code" || !currentSignUp) {
        throw new Error("Open the verification link from this email to finish creating your account.");
      }
      const result = await currentSignUp.attemptEmailAddressVerification({
        code: document.querySelector("#verify-email-code").value.trim(),
      });
      currentSignUp = result;
      await continueEmailPasswordSignUp(result);
    } catch (error) {
      showMessage(clerkMessage(error, "We couldn’t verify that code. Check it and try again."), "error");
    } finally {
      setBusy(verifyEmailForm, false);
    }
  });

  resendVerification.addEventListener("click", async () => {
    if (!currentSignUp || currentEmailStrategy !== "email_code") return;
    resendVerification.disabled = true;
    showMessage();
    try {
      await currentSignUp.prepareEmailAddressVerification({ strategy: "email_code" });
      showMessage("A new verification code has been sent.", "success");
    } catch (error) {
      showMessage(clerkMessage(error, "We couldn’t send another code yet. Please try again shortly."), "error");
    } finally {
      resendVerification.disabled = false;
    }
  });

  const resetRequestForm = document.querySelector("#reset-request-form");
  resetRequestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!resetRequestForm.reportValidity()) return;
    setBusy(resetRequestForm, true, "SENDING...");
    showMessage();
    try {
      await clerk.client.signIn.create({
        strategy: "reset_password_email_code",
        identifier: resetEmail.value.trim(),
      });
      showView("reset-code");
      showMessage("Password reset code sent. Check your email.", "success");
      document.querySelector("#reset-code").focus();
    } catch (error) {
      showMessage(clerkMessage(error, "We couldn’t send a reset code. Check the email address and try again."), "error");
    } finally {
      setBusy(resetRequestForm, false);
    }
  });

  const resetCodeForm = document.querySelector("#reset-code-form");
  resetCodeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!passwordsAreValid(resetPassword, resetConfirmPassword)) {
      resetPassword.reportValidity();
      resetConfirmPassword.reportValidity();
      return;
    }
    if (!resetCodeForm.reportValidity()) return;
    setBusy(resetCodeForm, true, "RESETTING...");
    showMessage();
    try {
      const result = await clerk.client.signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: document.querySelector("#reset-code").value.trim(),
        password: resetPassword.value,
      });
      if (result.status === "complete") {
        await activateSession(result.createdSessionId);
      } else if (result.status === "needs_second_factor") {
        showMessage("Your password was reset, but this account requires an additional verification step. Contact the site team to finish signing in.", "error");
      } else {
        throw new Error("We couldn’t complete the password reset. Check the code and try again.");
      }
    } catch (error) {
      showMessage(clerkMessage(error, "We couldn’t reset your password. Check the code and try again."), "error");
    } finally {
      setBusy(resetCodeForm, false);
    }
  });

  clerk.addListener((state) => renderHeader(state));
  renderHeader();

  const query = new URLSearchParams(window.location.search);
  const emailLinkStatus = query.get("__clerk_status");
  if (["verified", "failed", "expired", "client_mismatch"].includes(emailLinkStatus)) {
    try {
      await clerk.handleEmailLinkVerification({
        redirectUrl: landingUrl(),
        redirectUrlComplete: landingUrl(),
        onVerifiedOnOtherDevice: () => showMessage("Email verified. Return to the device where you started signup to continue."),
      });
      if (clerk.session) finishOnLanding();
      else if (clerk.client?.signUp?.status === "missing_requirements") {
        currentSignUp = clerk.client.signUp;
        await continueEmailPasswordSignUp(currentSignUp);
      }
      else {
        showView("sign-in");
        dialog.showModal();
        showMessage("Your email has been verified. Log in to continue.", "success");
      }
    } catch (error) {
      showView("sign-up");
      dialog.showModal();
      showMessage(clerkMessage(error, "That verification link could not be used. Request a new one."), "error");
    }
  } else if ([...query.keys()].some((key) => key.startsWith("__clerk_"))) {
    try {
      await clerk.handleRedirectCallback({
        signInUrl: landingUrl(),
        signUpUrl: landingUrl(),
        signInFallbackRedirectUrl: landingUrl(),
        signUpFallbackRedirectUrl: landingUrl(),
      });
      if (clerk.session) finishOnLanding();
      else if (clerk.client?.signUp?.status === "missing_requirements") {
        await continueOAuthSignUp(clerk.client.signUp);
      } else {
        showView("sign-in");
        dialog.showModal();
        showMessage("Google sign-in did not finish. Please try again.", "error");
      }
    } catch (error) {
      showView("sign-in");
      dialog.showModal();
      showMessage(clerkMessage(error, "Google sign-in could not be completed. Please try again."), "error");
    }
  }
}
