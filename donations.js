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

let selectedDonationAmount = 0;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    setupAmountSelection();
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

function getSelectedAmount() {
    const amountInput = document.getElementById('amount') || document.getElementById('customAmount');
    if (amountInput && amountInput.value) {
        const val = parseFloat(amountInput.value);
        if (!isNaN(val) && val > 0) return val;
    }
    return selectedDonationAmount;
}

function setupAmountSelection() {
    // Amount selection buttons (.amount-btn and .preset-btn)
    const amountButtons = document.querySelectorAll('.amount-btn, .preset-btn');
    const amountInput = document.getElementById('amount') || document.getElementById('customAmount');

    amountButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const amountAttr = this.dataset.amount;
            
            // Remove selected state from all buttons
            amountButtons.forEach(b => {
                b.classList.remove('selected', 'active');
            });
            
            // Add selected state to clicked button
            this.classList.add('selected', 'active');
            
            if (amountAttr === 'custom') {
                if (amountInput) {
                    amountInput.value = '';
                    amountInput.focus();
                }
                selectedDonationAmount = 0;
            } else {
                const parsed = parseFloat(amountAttr);
                selectedDonationAmount = !isNaN(parsed) ? parsed : 0;
                if (amountInput && selectedDonationAmount > 0) {
                    amountInput.value = selectedDonationAmount;
                }
            }
        });
    });
    
    // Custom amount input listener
    if (amountInput) {
        amountInput.addEventListener('input', function() {
            amountButtons.forEach(b => b.classList.remove('selected', 'active'));
            selectedDonationAmount = parseFloat(this.value) || 0;
        });
    }
}

function setupPaymentButtons() {
    // Stripe payment button
    const stripeBtn = document.getElementById('stripePaymentBtn');
    if (stripeBtn) {
        stripeBtn.addEventListener('click', handleStripePayment);
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
    const amount = getSelectedAmount();
    if (amount <= 0) {
        alert('Please select or enter a donation amount first.');
        const amountInput = document.getElementById('amount') || document.getElementById('customAmount');
        if (amountInput) amountInput.focus();
        return;
    }
    
    if (!DONATION_CONFIG.stripePaymentLink || DONATION_CONFIG.stripePaymentLink.includes('YOUR_LIVE_STRIPE_LINK')) {
        const proceedWithPayPal = confirm(
            `Stripe direct checkout is being configured.\n\nWould you like to give $${amount.toFixed(2)} securely via PayPal instead?`
        );
        if (proceedWithPayPal) {
            handlePayPalPayment();
        }
        return;
    }
    
    // Open Stripe payment page in new secure tab
    openSecureLink(DONATION_CONFIG.stripePaymentLink);
}

function handlePayPalPayment() {
    const amount = getSelectedAmount();
    if (amount <= 0) {
        alert('Please select or enter a donation amount first.');
        const amountInput = document.getElementById('amount') || document.getElementById('customAmount');
        if (amountInput) amountInput.focus();
        return;
    }
    
    // Open PayPal donation portal in new secure tab
    openSecureLink(DONATION_CONFIG.paypalPaymentLink);
}

function handleDigitalWalletPayment() {
    const amount = getSelectedAmount();
    if (amount <= 0) {
        alert('Please select or enter a donation amount.');
        return;
    }
    
    if (!window.PaymentRequest) {
        alert('Digital wallet payments are not supported on this device/browser.\n\nPlease use PayPal, Zelle, Venmo, or Cash App.');
        return;
    }
    
    alert(`Digital Wallet Payment\n\nAmount: $${amount.toFixed(2)}\n\nTo enable Apple Pay/Google Pay via Stripe, configure live Stripe keys.`);
}
