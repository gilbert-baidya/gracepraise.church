const fs = require('fs');
const path = require('path');
const days = require('./devotion-days-data.js');

// Base templates for reflections and prayers
const reflections = [
    { en: "Today we focus on surrender. Fasting is not just about food, but about yielding our will to God.", bn: "আজ আমরা সমর্পণের উপর মনোযোগ দিচ্ছি। উপবাস শুধুমাত্র খাবার সম্পর্কে নয়, বরং আমাদের ইচ্ছাকে ঈশ্বরের কাছে সমর্পণ করা।" },
    { en: "True repentance brings freedom. God is waiting with open arms to restore us.", bn: "প্রকৃত অনুতাপ স্বাধীনতা নিয়ে আসে। ঈশ্বর আমাদের পুনরুদ্ধার করার জন্য খোলা হাতে অপেক্ষা করছেন।" },
    { en: "In the silence of fasting, we can hear God's voice more clearly. Let us listen.", bn: "উপবাসের নীরবতায় আমরা ঈশ্বরের কণ্ঠ আরও স্পষ্টভাবে শুনতে পারি। আসুন আমরা শুনি।" },
    { en: "The cross calls us to die to self so that Christ may live in us.", bn: "ক্রুশ আমাদের আহ্বান করে যেন আমরা নিজের প্রতি মারা যাই, যাতে খ্রীষ্ট আমাদের মধ্যে জীবিত থাকেন।" },
    { en: "Renewal comes when we make space for the Holy Spirit to move in our hearts.", bn: "নবীকরণ আসে যখন আমরা পবিত্র আত্মাকে আমাদের হৃদয়ে কাজ করার জন্য স্থান দিই।" }
];

const prayers = [
    { en: "Lord, I surrender all to You. Have Your way in my life today.", bn: "প্রভু, আমি সবকিছু তোমার কাছে সমর্পণ করি। আজ আমার জীবনে তোমার ইচ্ছা পূর্ণ হোক।" },
    { en: "Father, cleanse my heart and renew a right spirit within me.", bn: "পিতা, আমার হৃদয় পরিষ্কার কর এবং আমার মধ্যে একটি সঠিক আত্মা নতুন কর।" },
    { en: "Holy Spirit, fill me afresh. I need Your strength and guidance.", bn: "পবিত্র আত্মা, আমাকে নতুন করে পূর্ণ কর। আমার তোমার শক্তি এবং নির্দেশনার প্রয়োজন।" },
    { en: "Jesus, help me to walk in Your footsteps of humility and love.", bn: "যীশু, আমাকে তোমার নম্রতা ও ভালোবাসার পদাঙ্ক অনুসরণ করতে সাহায্য কর।" }
];

const devotions = days.map(([day, topic, topicBn, verseRef, verseRefBn, tags]) => {
    // Deterministic selection based on day number
    const ref = reflections[(day - 1) % reflections.length];
    const pray = prayers[(day - 1) % prayers.length];

    // Calculate date
    const date = new Date(2026, 1, 17); // Feb 17 start
    date.setDate(date.getDate() + (day - 1));
    const dateStr = date.toISOString().split('T')[0];

    // Special content for Day 1 & 2 (preserve original)
    if (day === 1) return {
        day, date: dateStr, topic, topicBn,
        verseReference: verseRef, verseReferenceBn: verseRefBn,
        verseText: "Then Jesus was led by the Spirit into the wilderness to be tempted by the devil. After fasting forty days and forty nights, he was hungry. - Matthew 4:1-2",
        verseTextBn: "তখন আত্মা যীশুকে প্রান্তরে নিয়ে গেলেন, যেন দিয়াবল দ্বারা পরীক্ষিত হন। আর তিনি চল্লিশ দিন ও চল্লিশ রাত উপবাস করার পর ক্ষুধার্ত হলেন। - মথি ৪:১-২",
        reflection: "Our 40-day journey begins by following the footsteps of Jesus, who was led by the Spirit into the wilderness. This was not a random detour but a divine appointment. Fasting is an invitation to leave the noise of the world behind and enter a period of focused consecration. The wilderness is a place of testing, but it is also a place of intimate fellowship with the Father. It's where distractions are stripped away, and we become acutely aware of our dependence on God. As Jesus faced temptation, He relied on the Word of God. This season is our opportunity to do the same—to feast on Scripture as we abstain from physical food, preparing our hearts for the victory God has promised.",
        reflectionBn: "আমাদের ৪০ দিনের যাত্রা শুরু হয় যীশুর পদাঙ্ক অনুসরণ করে, যাঁকে আত্মা প্রান্তরে নিয়ে গিয়েছিলেন। এটি কোনো আকস্মিক ভ্রমণ ছিল না, বরং একটি ঐশ্বরিক অ্যাপয়েন্টমেন্ট ছিল। উপবাস হলো পৃথিবীর কোলাহল পেছনে ফেলে রেখে एकाগ্র تقدیس-এর এক পর্যায়ে প্রবেশ করার আমন্ত্রণ। প্রান্তর হলো পরীক্ষার জায়গা, কিন্তু এটি পিতার সঙ্গে ঘনিষ্ঠ সহভাগিতারও জায়গা। এখানে মনোযোগ বিক্ষেপকারী জিনিসগুলো সরিয়ে দেওয়া হয়, এবং আমরা ঈশ্বরের ওপর আমাদের নির্ভরতার বিষয়ে তীব্রভাবে সচেতন হই। যীশু যেমন পরীক্ষার মুখোমুখি হয়েছিলেন, তিনি ঈশ্বরের বাক্যের ওপর নির্ভর করেছিলেন। এই সময়টা আমাদের জন্যও একই কাজ করার সুযোগ—শারীরিক খাবার থেকে বিরত থেকে আমরা শাস্ত্রের ওপর ভোজ করি, ঈশ্বর যে বিজয়ের প্রতিশ্রুতি দিয়েছেন তার জন্য আমাদের হৃদয় প্রস্তুত করি।",
        prayer: "Father, as I begin this 40-day fast, lead me by Your Spirit into a deeper wilderness experience with You. Quiet the distractions around me and help me to hunger for Your Word more than for food. Strengthen me to face every temptation with the truth of Scripture, just as Jesus did. I consecrate this time to You, believing for breakthrough and victory. My hope is in You, for Your Word declares: 'The LORD is my strength and my shield; in him my heart trusts, and I am helped' (Psalm 28:7). Amen.",
        prayerBn: "পিতা, এই ৪০ দিনের উপবাস শুরু করার সময়, আপনার আত্মার দ্বারা আমাকে আপনার সঙ্গে এক গভীর প্রান্তর অভিজ্ঞতায় নিয়ে যান। আমার চারপাশের বিক্ষেপগুলো শান্ত করুন এবং খাবারের চেয়ে আপনার বাক্যের জন্য আমাকে ক্ষুধার্ত হতে সাহায্য করুন। যীশুর মতো শাস্ত্রের সত্য দিয়ে প্রতিটি প্রলোভনের মোকাবিলা করার জন্য আমাকে শক্তিশালী করুন। আমি এই সময়টি আপনার কাছে উৎসর্গ করছি, সাফল্য এবং বিজয়ের জন্য বিশ্বাস করছি। আমার আশা আপনার ওপর, কারণ আপনার বাক্য ঘোষণা করে: 'সদাপ্রভু আমার শক্তি ও আমার ঢাল; আমার হৃদয় তাঁর ওপর বিশ্বাস করে, এবং আমি সাহায্য পেয়েছি' (গীতসংহিতা ২৮:৭)। আমেন।",
        tags
    };

    if (day === 2) return {
        day, date: dateStr, topic, topicBn,
        verseReference: verseRef, verseReferenceBn: verseRefBn,
        verseText: "“Even now,” declares the LORD, “return to me with all your heart, with fasting and weeping and mourning. Rend your heart and not your garments.” - Joel 2:12-13",
        verseTextBn: "কিন্তু, সদাপ্রভু বলেন, এখনও তোমরা সমস্ত অন্তঃকরণের সহিত, এবং উপবাস, রোদন ও বিলাপ সহকারে আমার কাছে ফিরিয়া আইস। আর আপন আপন বস্ত্র না ছিঁড়িয়া অন্তঃকরণ চির। - যোয়েল ২:১২-১৩",
        reflection: "Fasting is more than an outward act; it is an invitation to deep, internal transformation. The prophet Joel makes a powerful distinction between religious ritual and genuine repentance. It is easy to 'rend our garments'—to perform outward acts of piety that impress others. But God is not interested in our performance; He is interested in our hearts. He calls us to 'rend our hearts,' to break open the hardened, prideful, and wounded parts of our inner being before Him. This season of fasting is a sacred opportunity to move beyond simply giving up food. It is a time to surrender our will, confess our hidden sins, and return to the Lord with sincerity. He is not waiting to condemn us but to welcome us with grace, compassion, and abundant love. True breakthrough begins when our hearts break for what breaks His.",
        reflectionBn: "উপবাস শুধুমাত্র একটি বাহ্যিক আচার-অনুষ্ঠানের চেয়েও বেশি কিছু; এটি গভীর, অভ্যন্তরীণ পরিবর্তনের এক আমন্ত্রণ। ভাববাদী যোয়েল ধার্মিকতার বাহ্যিক প্রদর্শন এবং প্রকৃত অনুতাপের মধ্যে একটি শক্তিশালী পার্থক্য তুলে ধরেছেন। ‘বস্ত্র ছিন্ন করা’ বা অন্যদের দেখানোর জন্য ধার্মিকতার কাজ করা সহজ। কিন্তু ঈশ্বর আমাদের বাহ্যিক কাজ নিয়ে আগ্রহী নন; তিনি আমাদের হৃদয় দেখতে চান। তিনি আমাদের ‘হৃদয় ছিন্ন করতে’ বলেন, অর্থাৎ আমাদের ভেতরের কঠিন, গর্বিত এবং আহত অংশগুলোকে তাঁর সামনে ভেঙে ফেলতে বলেন। উপবাসের এই সময়টি কেবল খাবার ত্যাগ করার চেয়েও বেশি কিছু। এটি আমাদের ইচ্ছা সমর্পণ করার, গোপন পাপ স্বীকার করার এবং আন্তরিকতার সাথে প্রভুর কাছে ফিরে আসার এক পবিত্র সুযোগ। তিনি আমাদের শাস্তি দেওয়ার জন্য অপেক্ষা করছেন না, বরং অনুগ্রহ, করুণা এবং গভীর ভালোবাসা দিয়ে আমাদের স্বাগত জানাতে প্রস্তুত। যখন তাঁর ইচ্ছার বিরুদ্ধে করা কাজের জন্য আমাদের হৃদয় ভেঙে যায়, তখনই সত্যিকারের আধ্যাত্মিক সাফল্য শুরু হয়।",
        prayer: "Gracious and compassionate God, I return to You today. Forgive me for focusing on outward actions instead of my heart's condition. Help me to rend my heart in sincere repentance. Thank you for being slow to anger and abounding in love. Create in me a clean heart, O God, and renew a right spirit within me. Amen.",
        prayerBn: "হে কৃপাময় ও করুণাময় ঈশ্বর, আজ আমি আপনার কাছে ফিরে এসেছি। আমার হৃদয়ের অবস্থার চেয়ে বাহ্যিক কাজের ওপর মনোযোগ দেওয়ার জন্য আমাকে ক্ষমা করুন। আমাকে আন্তরিক অনুতাপে হৃদয় ছিন্ন করতে সাহায্য করুন। ক্রোধে ধীর এবং প্রেমে পরিপূর্ণ হওয়ার জন্য আপনাকে ধন্যবাদ। হে ঈশ্বর, আমার অন্তরে এক ಶುচি হৃদয় সৃষ্টি করুন এবং আমার মধ্যে এক সঠিক আত্মা নতুন করে দিন। আমেন।",
        tags
    };

    return {
        day,
        date: dateStr,
        topic,
        topicBn,
        verseReference: verseRef,
        verseReferenceBn: verseRefBn,
        verseText: `${verseRef} (NIV)`, // Placeholder until looked up
        verseTextBn: `${verseRefBn} (পবিত্র বাইবেল)`, // Placeholder
        reflection: ref.en,
        reflectionBn: ref.bn,
        prayer: pray.en,
        prayerBn: pray.bn,
        tags
    };
});

const output = {
    year: 2026,
    totalDays: 40,
    devUnlockAllDays: true, // DEV MODE FLAG
    title: "Lent - 40 Days of Victory",
    titleBn: "বিজয়ের ৪০ দিন উপবাস",
    description: "A 40-day journey of fasting and prayer, following the example of Jesus in the wilderness, for spiritual breakthrough and victory.",
    descriptionBn: "যীশুর প্রান্তরের উদাহরণ অনুসরণ করে ৪০ দিনের উপবাস ও প্রার্থনার যাত্রা, আধ্যাত্মিক সাফল্য এবং বিজয়ের জন্য।",
    devotions
};

fs.writeFileSync(
    path.join(__dirname, '../lent-fasting-devotions.json'),
    JSON.stringify(output, null, 2)
);

console.log('✅ Generated 40 days of devotions');
