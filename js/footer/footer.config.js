// =============================================================================
// FOOTER CONFIGURATION — Single Source of Truth
// Grace and Praise Bangladeshi Church
// =============================================================================

export const FOOTER_CONFIG = {
    // ── Brand Identity ──
    brand: {
        name: "Grace and Praise Bangladeshi Church",
        nameBengali: "গ্রেস অ্যান্ড প্রেইজ বাংলাদেশী চার্চ",
        tagline: "A community where faith meets grace",
        address: {
            street: "1325 Richardson Street",
            city: "San Bernardino, CA 92408"
        },
        directionsUrl: "https://maps.google.com/?q=1325+Richardson+Street,+San+Bernardino,+CA+92408",
        phone: "(909) 555-1234", // TODO: Replace with actual phone number
        email: "info@gracepraise.church",
        serviceTime: "Sundays at 10:30 AM"
    },

    // ── Call-to-Action Buttons ──
    cta: [
        {
            label: "Plan a Visit",
            url: "/plan-visit.html",
            icon: "📍",
            description: "Join us this Sunday"
        },
        {
            label: "Watch Online",
            url: "/index.html#live", // TODO: Create dedicated live.html page if needed
            icon: "📺",
            description: "Stream our services"
        },
        {
            label: "Prayer Request",
            url: "/prayer-request.html",
            icon: "🙏",
            description: "We're here for you"
        },
        {
            label: "Give",
            url: "/give.html",
            icon: "💝",
            description: "Support our ministry"
        }
    ],

    // ── Footer Navigation Columns (max 4 columns, max 6 links each) ──
    columns: [
        {
            heading: "Visit",
            links: [
                { label: "Plan Your Visit", url: "/plan-visit.html" },
                { label: "Our Beliefs", url: "/beliefs.html" },
                { label: "Core Values", url: "/core-values.html" },
                { label: "Leadership", url: "/leadership.html" },
                { label: "Our History", url: "/history.html" },
                { label: "Ministries", url: "/ministries.html" }
            ]
        },
        {
            heading: "Connect",
            links: [
                { label: "Bible Study", url: "/ministries.html#bible-study" },
                { label: "Men's Fellowship", url: "/ministries.html#mens-fellowship" },
                { label: "Youth Ministry", url: "/ministries.html#youth" },
                { label: "Kids Ministry", url: "/ministries.html#kids" },
                { label: "Testimonies", url: "/testimonies.html" },
                { label: "Calendar", url: "/calendar.html" }
            ]
        },
        {
            heading: "Devotions",
            links: [
                { label: "Daily Devotion", url: "/daily-devotion.html" },
                { label: "Family Devotion", url: "/family-devotion.html" },
                { label: "Children's Devotion", url: "/children-devotion.html" },
                { label: "Youth Devotion", url: "/youth-devotion.html" },
                { label: "Lent — 40 Days", url: "/lent-fasting.html" },
                { label: "Couples Devotion", url: "/couples-devotion.html" }
            ]
        },
        {
            heading: "Resources",
            links: [
                { label: "Events Calendar", url: "/calendar.html" },
                { label: "Songbook", url: "/songbook.html" },
                { label: "Prayer Requests", url: "/prayer-request.html" },
                { label: "Give Online", url: "/give.html" },
                { label: "Privacy Policy", url: "/privacy-policy.html" },
                { label: "Terms & Conditions", url: "/terms-conditions.html" }
            ]
        }
    ],

    // ── Social Media Links ──
    social: [
        {
            platform: "YouTube",
            url: "https://youtube.com/@gpbc", // TODO: Replace with actual YouTube channel
            label: "Watch our sermons on YouTube",
            icon: "youtube"
        },
        {
            platform: "Facebook",
            url: "https://facebook.com/graceandpraisebangladeshichurch", // TODO: Verify Facebook page URL
            label: "Follow us on Facebook",
            icon: "facebook"
        },
        {
            platform: "Instagram",
            url: "https://instagram.com/gpbc", // TODO: Replace with actual Instagram handle
            label: "See our photos on Instagram",
            icon: "instagram"
        }
    ],

    // ── Legal Links (Bottom Bar) ──
    legalLinks: [
        { label: "Privacy Policy", url: "/privacy-policy.html" },
        { label: "Terms & Conditions", url: "/terms-conditions.html" }
    ],

    // ── Legal Notices ──
    legal: {
        copyrightEntity: "Grace and Praise Bangladeshi Church",
        nonprofitNotice: "A registered 501(c)(3) non-profit organization"
    }
};
