// Prayer Request Form Handler
(function() {
    const form = document.getElementById('prayer-form');
    const successMessage = document.getElementById('prayer-success');
    
    if (!form) return;
    
    // Handle form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data (for future backend integration)
        const formData = {
            name: document.getElementById('prayer-name').value,
            email: document.getElementById('prayer-email').value,
            request: document.getElementById('prayer-request').value,
            private: document.getElementById('prayer-private').checked
        };
        
        // Validate required field
        if (!formData.request.trim()) {
            alert('Please share your prayer request before submitting.');
            return;
        }
        
        // TODO: Send to backend
        // For now, just show success message
        
        // Hide form, show success message
        form.style.display = 'none';
        successMessage.style.display = 'block';
        
        // Scroll to success message
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Log form data (remove in production)
        console.log('Prayer request submitted:', formData);
    });
})();

// Reset form function (called by "Submit Another Request" button)
function resetPrayerForm() {
    const form = document.getElementById('prayer-form');
    const successMessage = document.getElementById('prayer-success');
    
    // Reset form fields
    form.reset();
    
    // Show form, hide success message
    form.style.display = 'block';
    successMessage.style.display = 'none';
    
    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
