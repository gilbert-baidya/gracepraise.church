// Donation System
// Handles all donation-related functionality across Grace and Praise Bangladeshi Church

// Stripe & PayPal Production Configuration
// In production, set stripePaymentLink to your verified live Stripe Payment Link
const DONATION_CONFIG = {
    stripePaymentLink: 'https://buy.stripe.com/YOUR_LIVE_STRIPE_LINK_HERE',
    stripePublishableKey: 'pk_live_YOUR_STRIPE_KEY_HERE',
    paypalPaymentLink: 'https://www.paypal.com/ncp/payment/V3AF32ZHJSAME',
    venmoLink: 'https://venmo.com/gpbc-church',
    cashappLink: 'https://cash.app/$gpbcchurch',
    zelleEmail: 'gracepraisebangladeshichurch@gmail.com'
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    setupPaymentButtons();
    generateDonationQRCodes();
});

function openSecureLink(url) {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function isStripePaymentConfigured() {
    return Boolean(
        DONATION_CONFIG.stripePaymentLink &&
        !DONATION_CONFIG.stripePaymentLink.includes('YOUR_LIVE_STRIPE_LINK')
    );
}

function setupPaymentButtons() {
    // Stripe payment button
    const stripeBtn = document.getElementById('stripePaymentBtn');
    if (stripeBtn && isStripePaymentConfigured()) {
        stripeBtn.hidden = false;
        stripeBtn.addEventListener('click', handleStripePayment);
    } else if (stripeBtn) {
        stripeBtn.remove();
    }

    // PayPal payment button
    const paypalBtn = document.getElementById('paypalPaymentBtn');
    if (paypalBtn) {
        paypalBtn.addEventListener('click', handlePayPalPayment);
    }
}

function generateDonationQRCodes() {
    // Generate Zelle QR Code
    const zelleDiv = document.getElementById('zelleQR');
    if (zelleDiv && typeof QRCode !== 'undefined') {
        zelleDiv.innerHTML = '';
        new QRCode(zelleDiv, {
            text: DONATION_CONFIG.zelleEmail,
            width: 150,
            height: 150,
            colorDark: "#667eea",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
    
    // Generate PayPal QR Code
    const paypalDiv = document.getElementById('paypalQR');
    if (paypalDiv && typeof QRCode !== 'undefined') {
        paypalDiv.innerHTML = '';
        new QRCode(paypalDiv, {
            text: DONATION_CONFIG.paypalPaymentLink,
            width: 150,
            height: 150,
            colorDark: "#0070ba",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
    
    // Generate Venmo QR Code
    const venmoDiv = document.getElementById('venmoQR');
    if (venmoDiv && typeof QRCode !== 'undefined') {
        venmoDiv.innerHTML = '';
        new QRCode(venmoDiv, {
            text: DONATION_CONFIG.venmoLink,
            width: 150,
            height: 150,
            colorDark: "#008CFF",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
    
    // Generate Cash App QR Code
    const cashappDiv = document.getElementById('cashappQR');
    if (cashappDiv && typeof QRCode !== 'undefined') {
        cashappDiv.innerHTML = '';
        new QRCode(cashappDiv, {
            text: DONATION_CONFIG.cashappLink,
            width: 150,
            height: 150,
            colorDark: "#00D64F",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
}

function handleStripePayment() {
    // Open Stripe payment page in new secure tab
    openSecureLink(DONATION_CONFIG.stripePaymentLink);
}

function handlePayPalPayment() {
    // Open PayPal donation portal in new secure tab
    openSecureLink(DONATION_CONFIG.paypalPaymentLink);
}
