/**
 * Utility functions for handling email-related operations
 */

/**
 * Determines if the user is on a mobile device
 * @returns {boolean} True if on mobile device
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Gets the appropriate email provider URL based on the email domain
 * @param {string} email - User's email address
 * @returns {Object} Object containing provider name and URL
 */
export function getEmailProviderInfo(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  
  // Default provider info
  let providerInfo = {
    name: 'your email provider',
    url: null
  };
  
  // Check for common email providers
  if (domain?.includes('gmail.com')) {
    providerInfo = {
      name: 'Gmail',
      url: isMobileDevice() 
        ? 'googlegmail://' // Gmail app deep link
        : 'https://mail.google.com/mail/u/0/#inbox'
    };
  } else if (domain?.includes('outlook.com') || domain?.includes('hotmail.com')) {
    providerInfo = {
      name: 'Outlook',
      url: isMobileDevice()
        ? 'ms-outlook://' // Outlook app deep link
        : 'https://outlook.live.com/mail/0/inbox'
    };
  } else if (domain?.includes('yahoo.com')) {
    providerInfo = {
      name: 'Yahoo Mail',
      url: isMobileDevice()
        ? 'ymail://' // Yahoo Mail app deep link
        : 'https://mail.yahoo.com/d/folders/1'
    };
  } else if (domain?.includes('icloud.com') || domain?.includes('me.com') || domain?.includes('mac.com')) {
    providerInfo = {
      name: 'iCloud Mail',
      url: isMobileDevice() && /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? 'message://' // iOS Mail app deep link
        : 'https://www.icloud.com/mail'
    };
  } else if (domain?.includes('protonmail.com') || domain?.includes('pm.me')) {
    providerInfo = {
      name: 'ProtonMail',
      url: 'https://mail.proton.me/inbox'
    };
  }
  
  return providerInfo;
}

/**
 * Creates email verification toast content with provider-specific links
 * @param {string} email - User's email address
 * @returns {Object} Object containing toast title, description, and action
 */
export function createVerificationToastContent(email) {
  const { name: providerName, url: providerUrl } = getEmailProviderInfo(email);
  
  return {
    title: 'Verification Email Sent',
    description: `Please check your inbox at ${email} and click the verification link to complete your registration.`,
    action: providerUrl ? {
      label: `Open ${providerName}`,
      url: providerUrl
    } : null
  };
}
