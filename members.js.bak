// Member Registration System

// Initialize member registration when page loads
document.addEventListener('DOMContentLoaded', function() {
    setupMemberRegistration();
    loadMembersToCalendar();
});

function setupMemberRegistration() {
    // Member registration button
    const specialDaysRegistrationBtn = document.getElementById('specialDaysRegistrationBtn');
    if (specialDaysRegistrationBtn) {
        specialDaysRegistrationBtn.addEventListener('click', showMemberRegistrationModal);
    }
    
    // Show registration form button
    const showRegistrationForm = document.getElementById('showRegistrationForm');
    if (showRegistrationForm) {
        showRegistrationForm.addEventListener('click', () => {
            const memberRegistrationModal = document.getElementById('memberRegistrationModal');
            const registrationFormModal = document.getElementById('registrationFormModal');
            if (memberRegistrationModal) {
                memberRegistrationModal.style.display = 'none';
            }
            if (registrationFormModal) {
                registrationFormModal.style.display = 'block';
            }
        });
    }
    
    // Cancel registration
    const cancelRegistration = document.getElementById('cancelRegistration');
    if (cancelRegistration) {
        cancelRegistration.addEventListener('click', () => {
            const registrationFormModal = document.getElementById('registrationFormModal');
            if (registrationFormModal) {
                registrationFormModal.style.display = 'none';
            }
        });
    }
    
    // Member registration form submission
    const memberRegistrationForm = document.getElementById('memberRegistrationForm');
    if (memberRegistrationForm) {
        memberRegistrationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitMemberRegistration();
        });
    }
    
    // Anniversary checkbox toggle
    const hasAnniversary = document.getElementById('hasAnniversary');
    if (hasAnniversary) {
        hasAnniversary.addEventListener('change', (e) => {
            const anniversarySection = document.getElementById('anniversarySection');
            if (anniversarySection) {
                anniversarySection.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    }
}

function showMemberRegistrationModal() {
    const modal = document.getElementById('memberRegistrationModal');
    
    // Generate QR code for the registration form
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = ''; // Clear previous QR code
    
    const currentUrl = window.location.href;
    const registrationUrl = currentUrl.split('?')[0] + '?register=true';
    
    new QRCode(qrcodeDiv, {
        text: registrationUrl,
        width: 200,
        height: 200,
        colorDark: '#667eea',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Load and display members
    displayMembers();
    
    modal.style.display = 'block';
}

function submitMemberRegistration() {
    const name = document.getElementById('memberName').value.trim();
    const phone = document.getElementById('memberPhone').value.trim();
    const email = document.getElementById('memberEmail').value.trim();
    const social = document.getElementById('memberSocial').value.trim();
    const birthday = document.getElementById('memberBirthday').value;
    const hasAnniversary = document.getElementById('hasAnniversary').checked;
    const anniversary = document.getElementById('memberAnniversary').value;
    
    if (!name || !birthday) {
        alert('Please fill in all required fields (Name and Birthday)');
        return;
    }
    
    // Extract month and day from birthday (YYYY-MM-DD format)
    const birthdayParts = birthday.split('-');
    const birthdayMonthDay = `${birthdayParts[1]}-${birthdayParts[2]}`;
    
    let anniversaryMonthDay = null;
    if (hasAnniversary && anniversary) {
        const annParts = anniversary.split('-');
        anniversaryMonthDay = `${annParts[1]}-${annParts[2]}`;
    }
    
    const member = {
        name: name,
        phone: phone,
        email: email,
        social: social,
        birthday: birthdayMonthDay,
        anniversary: anniversaryMonthDay,
        registeredDate: new Date().toISOString()
    };
    
    // Save to localStorage
    const members = getMembers();
    members.push(member);
    localStorage.setItem('gpbcMembers', JSON.stringify(members));
    
    // Add to calendar for 2026
    addMemberToCalendar(member);
    
    // Close modal and show success
    document.getElementById('registrationFormModal').style.display = 'none';
    document.getElementById('memberRegistrationForm').reset();
    document.getElementById('anniversarySection').style.display = 'none';
    
    alert(`✓ Thank you ${name}! Your information has been registered.\nWe'll celebrate your special days at our Sunday services!`);
    
    // Refresh calendar
    if (typeof renderCalendar === 'function') {
        renderCalendar();
        renderMonthEvents();
    }
}

function getMembers() {
    const saved = localStorage.getItem('gpbcMembers');
    return saved ? JSON.parse(saved) : [];
}

function addMemberToCalendar(member) {
    const year = 2026;
    
    // Add birthday
    const [birthMonth, birthDay] = member.birthday.split('-');
    const birthdayDate = `${year}-${birthMonth}-${birthDay}`;
    events.push({
        date: birthdayDate,
        name: `🎂 ${member.name}'s Birthday`,
        category: 'gpbc',
        description: `Birthday celebration for ${member.name}`
    });
    
    // Add anniversary if exists
    if (member.anniversary) {
        const [annMonth, annDay] = member.anniversary.split('-');
        const anniversaryDate = `${year}-${annMonth}-${annDay}`;
        events.push({
            date: anniversaryDate,
            name: `💒 ${member.name}'s Anniversary`,
            category: 'gpbc',
            description: `Wedding anniversary celebration for ${member.name}`
        });
    }
    
    saveCustomEvents();
}

function loadMembersToCalendar() {
    const members = getMembers();
    members.forEach(member => {
        addMemberToCalendar(member);
    });
}

function displayMembers() {
    const members = getMembers();
    const membersList = document.getElementById('membersList');
    
    if (members.length === 0) {
        membersList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No special days registered yet</p>';
        return;
    }
    
    membersList.innerHTML = '';
    members.forEach((member, index) => {
        const memberDiv = document.createElement('div');
        memberDiv.style.cssText = 'background: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #FF8C00;';
        
        const [birthMonth, birthDay] = member.birthday.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const birthdayText = `${monthNames[parseInt(birthMonth) - 1]} ${parseInt(birthDay)}`;
        
        let html = `
            <div style="font-weight: bold; margin-bottom: 5px;">${member.name}</div>
            <div style="font-size: 0.9em; color: #666;">🎂 Birthday: ${birthdayText}</div>
        `;
        if (member.phone) {
            html += `<div style="font-size: 0.9em; color: #666;">📞 Phone: ${member.phone}</div>`;
        }
        if (member.email) {
            html += `<div style="font-size: 0.9em; color: #666;">✉️ Email: ${member.email}</div>`;
        }
        if (member.social) {
            html += `<div style="font-size: 0.9em; color: #666;">🔗 Social: ${member.social}</div>`;
        }
        if (member.anniversary) {
            const [annMonth, annDay] = member.anniversary.split('-');
            const anniversaryText = `${monthNames[parseInt(annMonth) - 1]} ${parseInt(annDay)}`;
            html += `<div style="font-size: 0.9em; color: #666;">💒 Anniversary: ${anniversaryText}</div>`;
        }
        memberDiv.innerHTML = html;
        membersList.appendChild(memberDiv);
    });
}

// Check if URL has register parameter and show form
if (window.location.search.includes('register=true')) {
    setTimeout(() => {
        document.getElementById('registrationFormModal').style.display = 'block';
    }, 500);
}
