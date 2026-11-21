// Prayer Request Form Handler
// Secure submission pipeline for Grace and Praise Bangladeshi Church

(function() {
    const form = document.getElementById('prayer-form');
    const successMessage = document.getElementById('prayer-success');
    const errorMessage = document.getElementById('prayer-error');
    
    if (!form) return;

    const defaultErrorMessage = errorMessage ? errorMessage.textContent : '';
    function showError(message) {
        if (!errorMessage) return;
        errorMessage.textContent = message;
        errorMessage.hidden = false;
        errorMessage.focus();
    }

    let submissionId = null;
    let submittedFields = null;

    function createSubmissionId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
            return 'prayer-' + Array.from(window.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
        }
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }

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

        for (const [label, value] of [['Prayer name', sanitizedName], ['Prayer email', sanitizedEmail], ['Prayer request', sanitizedRequest]]) {
            if (value.length > 5000) {
                showError(`${label} must be 5000 characters or fewer. Your text is still here; please shorten it and try again.`);
                return;
            }
        }

        // Validate required field
        if (!sanitizedRequest) {
            alert('Please share your prayer request before submitting.');
            if (requestInput) requestInput.focus();
            return;
        }

        const prayerFields = {
            name: sanitizedName || (isPrivate ? 'Anonymous (Confidential)' : 'Anonymous Friend'),
            email: sanitizedEmail || 'Not provided',
            isAnonymous: !sanitizedName || isPrivate,
            categories: isPrivate ? 'Confidential / Pastoral Team' : 'General Prayer Request',
            details: sanitizedRequest
        };
        const currentFields = JSON.stringify(prayerFields);
        if (submissionId && submittedFields !== currentFields) {
            if (!window.confirm('Your previous prayer request may already have been delivered. Send your edited request as a new submission?')) return;
            submissionId = null;
        }
        if (!submissionId) submissionId = createSubmissionId();
        submittedFields = currentFields;

        // Set loading state
        if (errorMessage) errorMessage.hidden = true;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting your prayer...';
        }

        const endpoint = window.GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbxN025_2hB-8X00M3cDDkit0HqTSUuh2VttI3GJ26gbaohwKFncar3ExvJtJW4PtuqERQ/exec';

        const payload = {
            action: 'addPrayerRequest',
            prayer: {
                submissionId,
                ...prayerFields,
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
                throw new Error(`Endpoint responded with HTTP status ${response.status}`);
            }
            const result = await response.json();
            if (result?.success !== true) {
                throw new Error(typeof result?.message === 'string' ? result.message : defaultErrorMessage);
            }

            submissionId = null;
            submittedFields = null;
            form.style.display = 'none';
            if (successMessage) {
                successMessage.style.display = 'block';
                successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch (error) {
            console.warn('[Prayer Form] Submission failed:', error instanceof Error ? error.message : String(error));
            const message = error instanceof Error && error.message ? error.message : defaultErrorMessage;
            showError(message === defaultErrorMessage ? message : `${message} ${defaultErrorMessage}`);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    });
})();

// Reset form function (called by "Submit Another Request" button)
function resetPrayerForm() {
    const form = document.getElementById('prayer-form');
    const successMessage = document.getElementById('prayer-success');
    const errorMessage = document.getElementById('prayer-error');

    if (errorMessage) errorMessage.hidden = true;
    
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
