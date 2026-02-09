// Donation System
// Handles all donation-related functionality

// Stripe Configuration
const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_STRIPE_KEY_HERE'; // Not needed for payment links
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_dRmbJ3eeaa33fsBfjYfEk01';

let selectedDonationAmount = 0;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    setupAmountSelection();
    setupPaymentButtons();
    generateDonationQRCodes();
});

function setupAmountSelection() {
    // Amount selection buttons
    const amountButtons = document.querySelectorAll('.amount-btn');
    amountButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove selected class from all buttons
            amountButtons.forEach(b => {
                b.classList.remove('selected');
                b.style.background = 'white';
                b.style.color = '#667eea';
            });
            
            // Add selected class to clicked button
            this.classList.add('selected');
            this.style.background = '#667eea';
            this.style.color = 'white';
            
            // Set selected amount
            selectedDonationAmount = parseInt(this.dataset.amount);
            
            // Clear custom amount
            const customInput = document.getElementById('customAmount');
            if (customInput) {
                customInput.value = '';
            }
        });
    });
    
    // Custom amount input
    const customAmountInput = document.getElementById('customAmount');
    if (customAmountInput) {
        customAmountInput.addEventListener('input', function() {
            // Deselect preset amounts
            amountButtons.forEach(b => {
                b.classList.remove('selected');
                b.style.background = 'white';
                b.style.color = '#667eea';
            });
            
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
}

function generateDonationQRCodes() {
    // Generate Zelle QR Code
    const zelleDiv = document.getElementById('zelleQR');
    if (zelleDiv && typeof QRCode !== 'undefined') {
        zelleDiv.innerHTML = '';
        new QRCode(zelleDiv, {
            text: 'gracepraisebangladeshichurch@gmail.com',
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
            text: 'https://www.paypal.com/ncp/payment/V3AF32ZHJSAME',
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
            text: 'venmo.com/gpbc-church',
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
            text: 'https://cash.app/$gpbcchurch',
            width: 150,
            height: 150,
            colorDark: "#00D64F",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
}

function handleStripePayment() {
    if (selectedDonationAmount <= 0) {
        alert('Please select or enter a donation amount first');
        return;
    }
    
    // Open Stripe payment page in new tab
    const paymentUrl = `${STRIPE_PAYMENT_LINK}`;
    window.open(paymentUrl, '_blank');
    
    // Show confirmation
    setTimeout(() => {
        alert(`Opening secure Stripe payment page...\n\nAmount: $${selectedDonationAmount}\n\nThank you for your generous donation!`);
    }, 100);
}

function handleDigitalWalletPayment() {
    if (selectedDonationAmount <= 0) {
        alert('Please select or enter a donation amount');
        return;
    }
    
    // Check if Payment Request API is available
    if (!window.PaymentRequest) {
        alert('Digital wallet payments are not supported on this device/browser.\n\nPlease use:\n• PayPal\n• Zelle\n• Venmo\n• Cash App');
        return;
    }
    
    // For demonstration - in production you'd integrate with Stripe Payment Request API
    alert(`Digital Wallet Payment\n\nAmount: $${selectedDonationAmount}\n\nTo enable Apple Pay/Google Pay:\n1. Set up Stripe account\n2. Integrate Payment Request API\n\nFor now, please use other payment methods.`);
}

// Add hover effects for amount buttons
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .amount-btn:hover {
            background: #667eea !important;
            color: white !important;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
        }
        .amount-btn.selected {
            background: #667eea !important;
            color: white !important;
        }
    `;
    document.head.appendChild(style);
});
