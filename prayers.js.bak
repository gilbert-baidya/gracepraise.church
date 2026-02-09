// Prayer Request Management

function setupPrayerRequestModal() {
    const modal = document.getElementById('prayerRequestModal');
    const btn = document.getElementById('prayerRequestBtn');
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancelPrayerRequest');
    const form = document.getElementById('prayerRequestForm');
    const isAnonymous = document.getElementById('isAnonymous');
    const nameSection = document.getElementById('nameSection');
    const nameInput = document.getElementById('prayerName');

    // Open modal
    btn.addEventListener('click', () => {
        modal.style.display = 'block';
        resetPrayerForm();
        
        // Generate QR code when modal opens (ensures library is loaded)
        const prayerQrDiv = document.getElementById('prayerQrcode');
        if (prayerQrDiv && typeof QRCode !== 'undefined') {
            // Clear any existing QR code
            prayerQrDiv.innerHTML = '';
            
            // Generate QR code with prayer request direct link
            const prayerUrl = 'https://gilbert-baidya.github.io/gracepraise.church/calendar.html?prayer=true';
            new QRCode(prayerQrDiv, {
                text: prayerUrl,
                width: 200,
                height: 200,
                colorDark: "#6f42c1",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    });

    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Handle anonymous checkbox
    isAnonymous.addEventListener('change', () => {
        if (isAnonymous.checked) {
            nameSection.style.display = 'none';
            nameInput.required = false;
            nameInput.value = 'Anonymous';
        } else {
            nameSection.style.display = 'block';
            nameInput.required = true;
            nameInput.value = '';
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitPrayerRequest();
    });
}

async function submitPrayerRequest() {
    const name = document.getElementById('prayerName').value.trim();
    const details = document.getElementById('prayerDetails').value.trim();
    const isAnonymous = document.getElementById('isAnonymous').checked;
    
    // Get selected categories
    const categoryCheckboxes = document.querySelectorAll('input[name="prayerCategory"]:checked');
    const categories = Array.from(categoryCheckboxes).map(cb => cb.value);
    
    if (categories.length === 0) {
        alert('Please select at least one prayer category');
        return;
    }
    
    if (!details) {
        alert('Please enter your prayer request details');
        return;
    }
    
    const prayerRequest = {
        name: isAnonymous ? 'Anonymous' : name,
        isAnonymous: isAnonymous,
        categories: categories.join(', '),
        details: details,
        timestamp: new Date().toISOString(),
        status: 'Active'
    };
    
    // Show loading
    showLoadingIndicator('Submitting prayer request...');
    
    // Save to Google Sheets
    const saved = await savePrayerRequestToGoogleSheets(prayerRequest);
    
    hideLoadingIndicator();
    
    if (saved) {
        alert('✓ Your prayer request has been submitted. Our church community will pray for you.');
        document.getElementById('prayerRequestModal').style.display = 'none';
        resetPrayerForm();
        
        // Send notification email to church
        sendPrayerNotification(prayerRequest);
    } else {
        alert('⚠️ There was an error submitting your prayer request. Please try again or contact the church directly.');
    }
}

async function savePrayerRequestToGoogleSheets(prayerRequest) {
    if (!USE_GOOGLE_SHEETS || !GOOGLE_SHEETS_URL || GOOGLE_SHEETS_URL === 'YOUR_WEB_APP_URL_HERE') {
        console.log('Google Sheets not configured');
        return false;
    }

    try {
        const response = await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: 'addPrayerRequest',
                prayer: prayerRequest
            })
        });

        const data = await response.json();
        
        if (data.success) {
            console.log('Prayer request saved to Google Sheets successfully');
            return true;
        } else {
            console.error('Failed to save prayer request:', data.message);
            return false;
        }
    } catch (error) {
        console.error('Error saving prayer request:', error);
        return false;
    }
}

function sendPrayerNotification(prayer) {
    // Skip if EmailJS is not configured
    if (typeof emailjs === 'undefined' || EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
        console.log('Email notifications not configured.');
        return;
    }
    
    // Email template parameters
    const templateParams = {
        to_email: 'gracepraisebangladeshichurch@gmail.com',
        prayer_from: prayer.name,
        prayer_categories: prayer.categories,
        prayer_details: prayer.details,
        timestamp: new Date(prayer.timestamp).toLocaleString()
    };
    
    // Send email using EmailJS (using the same template or create a new one)
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(function(response) {
            console.log('Prayer notification sent successfully!', response.status, response.text);
        }, function(error) {
            console.log('Failed to send prayer notification:', error);
        });
}

function resetPrayerForm() {
    document.getElementById('prayerRequestForm').reset();
    document.getElementById('isAnonymous').checked = false;
    document.getElementById('nameSection').style.display = 'block';
    document.getElementById('prayerName').required = true;
    document.getElementById('prayerName').value = '';
}

// Auto-open prayer modal if URL has ?prayer=true or #prayer hash
function checkPrayerUrlParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    if (urlParams.get('prayer') === 'true' || hash === '#prayer') {
        // Wait for modal to be set up, then open it
        setTimeout(() => {
            const modal = document.getElementById('prayerRequestModal');
            if (modal) {
                document.getElementById('prayerRequestBtn').click();
                // Clear the hash to prevent reopening on page refresh
                if (hash === '#prayer') {
                    history.replaceState(null, null, ' ');
                }
            }
        }, 500);
    }
}

// Call on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkPrayerUrlParameter);
} else {
    checkPrayerUrlParameter();
}
