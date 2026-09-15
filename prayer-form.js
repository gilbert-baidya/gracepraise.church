// Prayer Request Form Handler
// Secure submission pipeline for Grace and Praise Bangladeshi Church

(function() {
    const form = document.getElementById('prayer-form');
    const successMessage = document.getElementById('prayer-success');
    
    if (!form) return;

    function sanitizeInput(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .replace(/[<>]/g, '') // Strip angle brackets to prevent injection
            .trim();
    }
    
    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.textContent : 'Share My Prayer';
        
        const nameInput = document.getElementById('prayer-name');
        const emailInput = document.getElementById('prayer-email');
        const requestInput = document.getElementById('prayer-request');
        const privateCheckbox = document.getElementById('prayer-private');

        const rawName = nameInput ? nameInput.value : '';
        const rawEmail = emailInput ? emailInput.value : '';
        const rawRequest = requestInput ? requestInput.value : '';
        const isPrivate = privateCheckbox ? privateCheckbox.checked : false;

        const sanitizedName = sanitizeInput(rawName);
        const sanitizedEmail = sanitizeInput(rawEmail);
        const sanitizedRequest = sanitizeInput(rawRequest);

        // Validate required field
        if (!sanitizedRequest) {
            alert('Please share your prayer request before submitting.');
            if (requestInput) requestInput.focus();
            return;
        }

        // Set loading state
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting your prayer...';
        }

        const endpoint = window.GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbxN025_2hB-8X00M3cDDkit0HqTSUuh2VttI3GJ26gbaohwKFncar3ExvJtJW4PtuqERQ/exec';

        const payload = {
            action: 'addPrayerRequest',
            prayer: {
                name: sanitizedName || (isPrivate ? 'Anonymous (Confidential)' : 'Anonymous Friend'),
                email: sanitizedEmail || 'Not provided',
                isAnonymous: !sanitizedName || isPrivate,
                categories: isPrivate ? 'Confidential / Pastoral Team' : 'General Prayer Request',
                details: sanitizedRequest,
                status: 'Active',
                timestamp: new Date().toISOString()
            }
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.warn(`[Prayer Form] Endpoint responded with HTTP status ${response.status}`);
            }
        } catch (error) {
            console.warn('[Prayer Form] Network note:', error.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }

            // Hide form, show success message
            form.style.display = 'none';
            if (successMessage) {
                successMessage.style.display = 'block';
                successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
})();

// Reset form function (called by "Submit Another Request" button)
function resetPrayerForm() {
    const form = document.getElementById('prayer-form');
    const successMessage = document.getElementById('prayer-success');
    
    if (form) {
        form.reset();
        form.style.display = 'block';
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Share My Prayer';
        }
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    if (successMessage) {
        successMessage.style.display = 'none';
    }
}
