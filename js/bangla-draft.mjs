const rows = text => Object.fromEntries(text.trim().split('\n').map(line => line.split(' = ')));

export const titles = {
  '/index': 'স্বাগতম',
  '/plan-visit': 'আপনার প্রথম রবিবার',
  '/give': 'দান করুন',
  '/gallery': 'ছবির গ্যালারি',
  '/about': 'আমাদের সম্পর্কে',
  '/beliefs': 'আমাদের বিশ্বাস',
  '/bible-reader': 'পবিত্র বাইবেল পাঠ',
  '/bible-slide-builder/index': 'বাইবেলের পদ দিয়ে স্লাইড তৈরি',
  '/calendar': 'মণ্ডলীর দিনপঞ্জি',
  '/children-devotion': 'শিশুদের বাইবেল ধ্যান',
  '/contact': 'যোগাযোগ করুন',
  '/core-values': 'আমাদের মূল মূল্যবোধ',
  '/couples-devotion': 'দম্পতিদের বাইবেল ধ্যান',
  '/daily-devotion': 'দৈনিক বাইবেল ধ্যান',
  '/family-devotion': 'পরিবারের বাইবেল ধ্যান',
  '/fasting-21days': '২১ দিনের উপবাস ও প্রার্থনা',
  '/fasting-30days': '৩০ দিনের উপবাস ও প্রার্থনা',
  '/fasting-40days': '৪০ দিনের উপবাস ও প্রার্থনা',
  '/give-monthly': 'মাসিক দান',
  '/gratitude-fasting': 'কৃতজ্ঞতার উপবাস',
  '/history': 'আমাদের ইতিহাস',
  '/kids/games/index': 'শিশুদের বাইবেলভিত্তিক খেলা',
  '/leadership': 'আমাদের নেতৃত্ব',
  '/lent-fasting': 'প্রাক্-পুনরুত্থান পর্বের উপবাস',
  '/ministries': 'আমাদের পরিচর্যা',
  '/ministries/index': 'আমাদের পরিচর্যা',
  '/ministries/bible-study': 'বাইবেল অধ্যয়ন',
  '/ministries/community-development': 'সমাজ উন্নয়ন',
  '/ministries/homeless-ministry': 'গৃহহীন মানুষের পরিচর্যা',
  '/ministries/hospital-ministry': 'হাসপাতালে রোগীদের পরিচর্যা',
  '/ministries/kids-ministry': 'শিশুদের পরিচর্যা',
  '/ministries/men-fellowship': 'পুরুষদের সহভাগিতা',
  '/ministries/mission-outreach': 'মিশন ও সুসমাচার প্রচার',
  '/ministries/prison-ministry': 'কারাবন্দিদের পরিচর্যা',
  '/ministries/support-missionaries': 'মিশনারিদের পাশে দাঁড়ান',
  '/ministries/worship-ministry': 'প্রশংসা ও উপাসনা',
  '/ministries/youth-ministry': 'যুবসমাজের পরিচর্যা',
  '/mission': 'আমাদের লক্ষ্য ও দর্শন',
  '/pastor/index': 'আমাদের পাস্টর',
  '/position-papers': 'বিশ্বাস ও চর্চা সম্পর্কে আমাদের অবস্থান',
  '/prayer-request': 'প্রার্থনার অনুরোধ',
  '/privacy-policy': 'গোপনীয়তা নীতি',
  '/sms-opt-in': 'মুঠোফোনে বার্তা পাওয়ার সম্মতি',
  '/songbook': 'উপাসনার গানের সংকলন',
  '/terms-conditions': 'ব্যবহারের শর্তাবলি',
  '/testimonies': 'বিশ্বাসের সাক্ষ্য',
  '/youth-devotion': 'যুবসমাজের বাইবেল ধ্যান',
  '/youth/games/index': 'যুবসমাজের বাইবেলভিত্তিক খেলা'
};

export const common = rows(`
Loading = লোড হচ্ছে
Loading… = লোড হচ্ছে…
Skip to main content = মূল বিষয়বস্তুতে যান
Your browser does not support the video tag. = আপনার ব্রাউজার এই ভিডিও চালাতে পারে না।
Home = প্রথম পাতা
About = আমাদের সম্পর্কে
ABOUT = আমাদের সম্পর্কে
About Overview = আমাদের সম্পর্কে এক নজরে
Our History = আমাদের ইতিহাস
Our Mission = আমাদের লক্ষ্য
Our Leadership = আমাদের নেতৃত্ব
Our Beliefs = আমাদের বিশ্বাস
Our Core Values = আমাদের মূল মূল্যবোধ
Position Papers = বিশ্বাস ও চর্চা সম্পর্কে আমাদের অবস্থান
Testimonies = বিশ্বাসের সাক্ষ্য
Tools = উপকরণ
Songbook = গানের সংকলন
Bible Slide Builder = বাইবেলের পদের স্লাইড তৈরি
Ministries = পরিচর্যা
MINISTRIES = পরিচর্যা
Ministries Overview = পরিচর্যা এক নজরে
Bible Study = বাইবেল অধ্যয়ন
Community Development = সমাজ উন্নয়ন
Homeless Ministry = গৃহহীন মানুষের পরিচর্যা
Hospital Ministry = হাসপাতালে রোগীদের পরিচর্যা
Kids Ministry = শিশুদের পরিচর্যা
Men Fellowship = পুরুষদের সহভাগিতা
Mission Outreach = মিশন ও সুসমাচার প্রচার
Prison Ministry = কারাবন্দিদের পরিচর্যা
Support Missionaries = মিশনারিদের পাশে দাঁড়ান
Praise & Worship Ministry = প্রশংসা ও উপাসনা
Next Service = পরবর্তী উপাসনা
Calendar = দিনপঞ্জি
Gallery = ছবির গ্যালারি
Prayer = প্রার্থনা
Devotion = বাইবেল ধ্যান
Holy Bible = পবিত্র বাইবেল
Daily Devotion = দৈনিক বাইবেল ধ্যান
Couples Devotion = দম্পতিদের বাইবেল ধ্যান
Family Devotion = পরিবারের বাইবেল ধ্যান
Youth Devotion = যুবসমাজের বাইবেল ধ্যান
Children Devotion = শিশুদের বাইবেল ধ্যান
21 Days Fasting = ২১ দিনের উপবাস
30 Days Fasting = ৩০ দিনের উপবাস
Lent - 40 Days = প্রাক্-পুনরুত্থান পর্বের ৪০ দিনের উপবাস
Gratitude Fasting (2026 - 26 Days) = কৃতজ্ঞতার উপবাস (২০২৬ — ২৬ দিন)
Give = দান করুন
LIVE = সরাসরি সম্প্রচার
Next Event = পরবর্তী আয়োজন
Sunday Worship = রবিবারের উপাসনা
5:00 PM = সন্ধ্যা ৫:০০টা
5:30 PM = বিকেল ৫:৩০টা
6:30 PM = সন্ধ্যা ৬:৩০টা
12:00 PM = দুপুর ১২:০০টা
About 90 minutes = প্রায় ৯০ মিনিট
Bangla & English = বাংলা ও ইংরেজি
Everyone is welcome = সবাইকে স্বাগতম
Plan Your Visit = আসার পরিকল্পনা করুন
Plan your visit = আসার পরিকল্পনা করুন
Plan Your Visit → = আসার পরিকল্পনা করুন →
Get Directions = দিকনির্দেশনা নিন
Get Directions → = দিকনির্দেশনা নিন →
What to Expect = কী আশা করতে পারেন
Fellowship = সহভাগিতা
Get Involved = যুক্ত হোন
Request Prayer = প্রার্থনার অনুরোধ জানান
Contact Us = যোগাযোগ করুন
Our Story = আমাদের কথা
Our Pastor = আমাদের পাস্টর
Praise & Worship = প্রশংসা ও উপাসনা
Care & Outreach = যত্ন ও সেবাকার্য
CONNECT = যুক্ত থাকুন
Sermons = প্রচারিত বাণী
Prayer Request = প্রার্থনার অনুরোধ
WORSHIP = উপাসনা
LOCATION = ঠিকানা
WORSHIP • COMMUNITY • FAITH • HOPE = উপাসনা • সহভাগিতা • বিশ্বাস • আশা
Saturday Fasting Prayer — 12:00 PM = শনিবার উপবাস ও প্রার্থনা — দুপুর ১২:০০টা
Friday Instrument Lesson — 5:30 PM = শুক্রবার বাদ্যযন্ত্রের পাঠ — বিকেল ৫:৩০টা
Friday Worship Practice — 6:30 PM = শুক্রবার উপাসনার অনুশীলন — সন্ধ্যা ৬:৩০টা
A PEOPLE FOR HIS GLORY = তাঁর গৌরবের জন্য এক জনগোষ্ঠী
Psalm 115:1 = গীতসংহিতা ১১৫:১
Grace and Praise Bangladeshi Church (GPBC). All rights reserved. = Grace and Praise Bangladeshi Church (GPBC)। সর্বস্বত্ব সংরক্ষিত।
Follow Us = আমাদের সঙ্গে যুক্ত থাকুন
Privacy = গোপনীয়তা
Terms = শর্তাবলি
Events = আয়োজনসমূহ
Details → = বিস্তারিত →
View Events = আয়োজনসমূহ দেখুন
Coming soon = শীঘ্রই আসছে
Coming Soon = শীঘ্রই আসছে
Friday = শুক্রবার
Saturday = শনিবার
Sunday = রবিবার
Worship Service = উপাসনা
Fasting Prayer = উপবাস ও প্রার্থনা
Friday Instrument Lesson = শুক্রবার বাদ্যযন্ত্রের পাঠ
Friday Worship Practice = শুক্রবার উপাসনার অনুশীলন
Instrument Lesson = বাদ্যযন্ত্রের পাঠ
Worship Practice = উপাসনার অনুশীলন
Email a Pastor = পাস্টরকে ইমেইল করুন
Sending... = পাঠানো হচ্ছে…
Sending… = পাঠানো হচ্ছে…
Submitting your prayer... = আপনার প্রার্থনার অনুরোধ পাঠানো হচ্ছে…
Thanksgiving Day = ধন্যবাদজ্ঞাপন দিবস
starts in = শুরু হতে বাকি
days = দিন
Days = দিন
hours = ঘণ্টা
Hours = ঘণ্টা
minutes = মিনিট
Minutes = মিনিট
seconds = সেকেন্ড
Seconds = সেকেন্ড
`);

export const pages = {
  '/index': rows(`
Living in Grace. = অনুগ্রহে বেঁচে থাকা।
Rising in Praise. = প্রশংসায় এগিয়ে চলা।
Sacred Focus = প্রভুতে মনোনিবেশ
Light of the Cross = ক্রুশের আলো
A luminous cross shaped by thousands of light particles—an invitation to pause, reflect, and center every step on Christ. = অসংখ্য আলোককণায় গড়া এক উজ্জ্বল ক্রুশ—একটু থামতে, ধ্যান করতে এবং প্রতিটি পদক্ষেপে খ্রীষ্টকে কেন্দ্রে রাখতে এক আমন্ত্রণ।
Join a Service = উপাসনায় যোগ দিন
New here? = প্রথমবার আসছেন?
We'd love to welcome you this Sunday. = এই রবিবার আপনাকে স্বাগত জানাতে আমরা আনন্দিত হব।
View the Full Visit Guide = প্রথমবার আসার সম্পূর্ণ নির্দেশিকা দেখুন
Come as you are = যেমন আছেন, তেমনই আসুন
A warm, family-friendly welcome. = পরিবারের সবার জন্য আন্তরিক অভ্যর্থনা।
Worship and ministry for our bilingual community. = আমাদের বাংলা ও ইংরেজিভাষী পরিবারের জন্য উপাসনা ও পরিচর্যা।
Biblical message & prayer = বাইবেলের বাণী ও প্রার্থনা
Christ-centered worship, Scripture, and prayer. = খ্রীষ্টকেন্দ্রিক উপাসনা, শাস্ত্রপাঠ ও প্রার্থনা।
Stay and connect with the GPBC family. = কিছু সময় থাকুন, GPBC পরিবারের সঙ্গে পরিচিত হোন।
Welcome to GPBC = GPBC-তে স্বাগতম
Welcome Home = আপন ঘরে স্বাগতম
Come as you are. Find your place. Grow together in Christ. = যেমন আছেন, তেমনই আসুন। আপন স্থান খুঁজে নিন। খ্রীষ্টেতে একসঙ্গে বেড়ে উঠুন।
A church family centered on Christ, growing together through faith, prayer, worship, fellowship, and service. = খ্রীষ্টকে কেন্দ্রে রেখে বিশ্বাস, প্রার্থনা, উপাসনা, সহভাগিতা ও সেবায় একসঙ্গে বেড়ে ওঠা এক মণ্ডলী-পরিবার।
There is a place for you here. = এখানে আপনারও আপন স্থান আছে।
Life Together = একসঙ্গে পথচলা
Our Church Family = আমাদের মণ্ডলী-পরিবার
Faith becomes family when we worship, grow, pray, and walk together. = একসঙ্গে উপাসনা, প্রার্থনা ও বিশ্বাসে বেড়ে ওঠার পথেই আমরা পরিবার হয়ে উঠি।
Worship Together = একসঙ্গে উপাসনা
Family Fellowship = পারিবারিক সহভাগিতা
Youth Gathering = যুবসমাজের মিলন
Growing Together = একসঙ্গে বেড়ে ওঠা
Rooted in God's Word = ঈশ্বরের বাক্যে শিকড় গাড়া
Prayer & Service = প্রার্থনা ও সেবা
Praying Together = একসঙ্গে প্রার্থনা
Your Next Step = আপনার পরবর্তী পদক্ষেপ
Your Journey Starts Here = আপনার পথচলা এখান থেকেই
Come as you are. Find your place. Grow in Christ. Build His Kingdom. = যেমন আছেন, তেমনই আসুন। আপন স্থান খুঁজে নিন। খ্রীষ্টেতে বেড়ে উঠুন। তাঁর রাজ্যের কাজে অংশ নিন।
Come = আসুন
Worship With Us = আমাদের সঙ্গে উপাসনা করুন
Come into God's presence and experience worship, prayer, and the Word together. = ঈশ্বরের সান্নিধ্যে আসুন; একসঙ্গে উপাসনা, প্রার্থনা ও তাঁর বাক্যে অংশ নিন।
Belong = আপন হয়ে উঠুন
Find Your Family = আপন পরিবার খুঁজে নিন
You were never meant to walk alone. Build meaningful relationships in the GPBC family. = আপনাকে একা পথ চলতে হবে না। GPBC পরিবারে আন্তরিক সম্পর্ক গড়ে তুলুন।
Connect With Us = আমাদের সঙ্গে যুক্ত হোন
Become = গড়ে উঠুন
Grow in Christ = খ্রীষ্টেতে বেড়ে উঠুন
Grow through Scripture, prayer, discipleship, and a deeper relationship with Jesus. = শাস্ত্রপাঠ, প্রার্থনা, শিষ্যত্ব এবং যীশুর সঙ্গে গভীর সম্পর্কের মধ্য দিয়ে বেড়ে উঠুন।
Grow With Us = আমাদের সঙ্গে বেড়ে উঠুন
Build = গড়ে তুলুন
Serve With Purpose = ঈশ্বরের উদ্দেশ্য নিয়ে সেবা করুন
Use your gifts to serve God, strengthen the church, and make a difference in the lives of others. = আপনার দান ও প্রতিভা দিয়ে ঈশ্বরের সেবা করুন, মণ্ডলীকে শক্তিশালী করুন এবং অন্যের জীবনে কল্যাণ বয়ে আনুন।
Start Serving = সেবায় অংশ নিন
At Grace and Praise, we refer to the discipleship journey as the Transformational Loop – becoming more like Jesus as we grow in faith. We want to help you Follow Jesus with your life, Grow Together in community, Serve One Another with your unique gifts, and Change the World with the love of Christ. If you're ready to take your next step of faith, we are here to help. = Grace and Praise-এ শিষ্যত্বের এই পথচলাকে আমরা বলি রূপান্তরের চক্র—বিশ্বাসে বেড়ে ওঠার সঙ্গে সঙ্গে যীশুর মতো হয়ে ওঠা। আমরা চাই আপনি জীবন দিয়ে যীশুকে অনুসরণ করুন, সহভাগিতায় একসঙ্গে বেড়ে উঠুন, আপনার নিজস্ব দান দিয়ে একে অন্যের সেবা করুন এবং খ্রীষ্টের ভালোবাসা দিয়ে জগতে পরিবর্তন আনুন। বিশ্বাসের পরবর্তী পদক্ষেপ নিতে চাইলে আমরা আপনার পাশে আছি।
Experience The Loop = রূপান্তরের এই পথচলায় অংশ নিন
Follow Jesus = যীশুকে অনুসরণ করুন
Grow Together = একসঙ্গে বেড়ে উঠুন
Serve One Another = একে অন্যের সেবা করুন
Change The World = জগতে পরিবর্তন আনুন
Our Father in Heaven = আমাদের স্বর্গীয় পিতা
When Jesus taught us to pray, He revealed seven aspects of our Heavenly Father's nature. Each dimension reflects His character, His kingdom, and His perfect will for our lives. This sacred wheel invites us to meditate on who our Father truly is. = যীশু আমাদের প্রার্থনা শেখানোর সময় স্বর্গীয় পিতার স্বভাবের সাতটি দিক প্রকাশ করেছেন। প্রতিটি দিক তাঁর চরিত্র, তাঁর রাজ্য এবং আমাদের জীবনের জন্য তাঁর সিদ্ধ ইচ্ছাকে তুলে ধরে। এই চক্র আমাদের পিতার পরিচয় নিয়ে ধ্যান করতে আমন্ত্রণ জানায়।
Character = স্বভাব
Kingdom = রাজ্য
Will = ইচ্ছা
Provision = প্রয়োজনের জোগান
Forgiveness = ক্ষমা
Guidance = পথনির্দেশ
Protection = সুরক্ষা
The Father's Character = পিতার স্বভাব
The Father's Kingdom = পিতার রাজ্য
The Father's Will = পিতার ইচ্ছা
The Father's Provision = পিতার জোগান
The Father's Forgiveness = পিতার ক্ষমা
The Father's Guidance = পিতার পথনির্দেশ
The Father's Protection = পিতার সুরক্ষা
Matthew 6:9 = মথি ৬:৯
Matthew 6:10a = মথি ৬:১০ক
Matthew 6:10b = মথি ৬:১০খ
Matthew 6:11 = মথি ৬:১১
Matthew 6:12 = মথি ৬:১২
Matthew 6:13a = মথি ৬:১৩ক
Matthew 6:13b = মথি ৬:১৩খ
"Our Father in heaven, hallowed be Your name" — He is holy, loving, and worthy of reverence. = “হে আমাদের স্বর্গস্থ পিতঃ তোমার নাম পবিত্র বলিয়া মান্য হউক”—তিনি পবিত্র, প্রেমময় ও শ্রদ্ধার যোগ্য।
"Your kingdom come" — He reigns with justice, peace, and eternal authority. = “তোমার রাজ্য আইসুক”—তিনি ন্যায়, শান্তি ও অনন্ত কর্তৃত্বে রাজত্ব করেন।
"Your will be done" — His plans are perfect, trustworthy, and for our good. = “তোমার ইচ্ছা সিদ্ধ হউক”—তাঁর পরিকল্পনা সিদ্ধ, নির্ভরযোগ্য এবং আমাদের মঙ্গলের জন্য।
"Give us today our daily bread" — He sustains us with everything we need. = “আমাদের প্রয়োজনীয় খাদ্য আজ আমাদিগকে দেও”—তিনি আমাদের প্রয়োজনের সবকিছু জোগান দেন।
"Forgive us our debts" — His mercy is boundless, cleansing us completely. = “আর আমাদের অপরাধ সকল ক্ষমা কর”—তাঁর দয়া অসীম; তিনি আমাদের সম্পূর্ণ শুচি করেন।
"Lead us not into temptation" — He guides our steps and guards our hearts. = “আর আমাদিগকে পরীক্ষাতে আনিও না”—তিনি আমাদের পদক্ষেপ পরিচালনা করেন এবং হৃদয় রক্ষা করেন।
"Deliver us from evil" — He is our shield, our refuge, and our strong tower. = “কিন্তু মন্দ হইতে রক্ষা কর”—তিনি আমাদের ঢাল, আশ্রয় ও দৃঢ় দুর্গ।
Stay Connected = যুক্ত থাকুন
Stay = সঙ্গে
Connected = থাকুন
Keep growing in faith and community beyond Sunday. = রবিবারের বাইরেও বিশ্বাস ও সহভাগিতায় বেড়ে উঠুন।
Connect in community = সহভাগিতায় যুক্ত হোন
Discover upcoming services, fellowships, and special events. = আসন্ন উপাসনা, সহভাগিতা ও বিশেষ আয়োজনের খবর জানুন।
Pray together = একসঙ্গে প্রার্থনা করুন
Share your prayer requests and pray with our church family. = আপনার প্রার্থনার অনুরোধ জানান এবং আমাদের মণ্ডলী-পরিবারের সঙ্গে প্রার্থনা করুন।
Submit a Prayer = প্রার্থনার অনুরোধ জানান
Serving God through worship, music, prayer, and praise as one church family. = এক মণ্ডলী-পরিবার হিসেবে উপাসনা, সংগীত, প্রার্থনা ও প্রশংসায় ঈশ্বরের সেবা করা।
Explore Ministry = পরিচর্যা সম্পর্কে জানুন
Pause and reflect = একটু থামুন ও ধ্যান করুন
Be encouraged by God's Word every day. = প্রতিদিন ঈশ্বরের বাক্যে উৎসাহ পান।
Read Today = আজকের ধ্যান পড়ুন
Give with purpose = ঈশ্বরের কাজে দান করুন
Partner with what God is doing through GPBC. = GPBC-র মাধ্যমে ঈশ্বরের কাজে অংশ নিন।
Give Online = অনলাইনে দান করুন
Ⅱ Pause = Ⅱ বিরতি
▶ Play = ▶ চালান
Holy Communion Service = প্রভুর ভোজের উপাসনা
Special monthly communion service - partaking in the Lord's Supper together as we remember Christ's sacrifice = খ্রীষ্টের আত্মত্যাগ স্মরণ করে একসঙ্গে প্রভুর ভোজে অংশ নেওয়ার বিশেষ মাসিক উপাসনা।
When = কখন
Where = কোথায়
Who's Invited = যাঁরা আমন্ত্রিত
Everyone! Bring family and friends. All ages welcome. = সবাই! পরিবার ও বন্ধুদের নিয়ে আসুন। সব বয়সীদের স্বাগতম।
RSVP / Support Event = উপস্থিতির খবর দিন / আয়োজনে সহায়তা করুন
View Full Calendar = সম্পূর্ণ দিনপঞ্জি দেখুন
No sermon selected = কোনো প্রচারিত বাণী বেছে নেওয়া হয়নি
`),
  '/plan-visit': rows(`
Beyond Sunday = রবিবারের বাইরেও
A rhythm of worship, practice, and prayer = উপাসনা, অনুশীলন ও প্রার্থনার নিয়মিত পথচলা
View Full Calendar = সম্পূর্ণ দিনপঞ্জি দেখুন
Upcoming Highlights = আসন্ন বিশেষ আয়োজন
Here are some important dates coming up. Join us as we celebrate and worship together! = সামনে রয়েছে কয়েকটি বিশেষ দিন। আসুন, একসঙ্গে আনন্দ ও উপাসনায় যোগ দিই!
Sunday Worship Service = রবিবারের উপাসনা
Join us for worship, prayer, and fellowship = উপাসনা, প্রার্থনা ও সহভাগিতায় আমাদের সঙ্গে যোগ দিন
Thanksgiving Day = ধন্যবাদজ্ঞাপন দিবস
Traditional harvest festival and day of gratitude = ফসলের জন্য কৃতজ্ঞতা প্রকাশের ঐতিহ্যবাহী উৎসব
Weekly Friday instrument lesson = শুক্রবারের সাপ্তাহিক বাদ্যযন্ত্রের পাঠ
`),
  '/prayer-request': rows(`
Prayer Changes Things = প্রার্থনায় পরিবর্তন আসে
You Are Not Alone = আপনি একা নন
Whatever you're walking through, we would be honored to pray with you. = আপনি যে পরিস্থিতির মধ্য দিয়েই যান না কেন, আপনার সঙ্গে প্রার্থনা করতে পারা আমাদের জন্য সম্মানের।
Share a Prayer Request = প্রার্থনার অনুরোধ জানান
Private & Confidential = ব্যক্তিগত ও গোপনীয়
Personally Prayed For = প্রতিটি অনুরোধের জন্য আন্তরিক প্রার্থনা
Real People. = বাস্তব জীবনের মানুষ।
Real Prayers. = হৃদয়ের প্রার্থনা।
A Real God. = জীবন্ত ঈশ্বর।
Prayer request assurances = আপনার প্রার্থনার অনুরোধ সম্পর্কে আমাদের অঙ্গীকার
We Pray With You = আমরা আপনার সঙ্গে প্রার্থনা করি
Every request is lifted up in sincere prayer by our church family. = আমাদের মণ্ডলী-পরিবার প্রতিটি অনুরোধ আন্তরিক প্রার্থনায় ঈশ্বরের কাছে তুলে ধরে।
Your Privacy Matters = আপনার গোপনীয়তা গুরুত্বপূর্ণ
Your prayer request is kept confidential and handled with care. = আপনার প্রার্থনার অনুরোধ গোপন রাখা হয় এবং যত্নের সঙ্গে গ্রহণ করা হয়।
You Are Heard = আপনার কথা আমরা শুনি
You are not just a request — you are a person loved by God and by our church family. = আপনি কেবল একটি অনুরোধ নন—ঈশ্বর ও আমাদের মণ্ডলী-পরিবার আপনাকে ভালোবাসে।
Share Your Heart = মনের কথা জানান
How Can We Pray for You? = আপনার জন্য কীভাবে প্রার্থনা করতে পারি?
Take your time. Even a few words are enough. = সময় নিয়ে লিখুন। অল্প কয়েকটি কথাও যথেষ্ট।
Your Name = আপনার নাম
Your name = আপনার নাম
(optional) = (ঐচ্ছিক)
Your Email = আপনার ইমেইল
Your Prayer Request = আপনার প্রার্থনার অনুরোধ
You can write just a few words. God understands. = অল্প কয়েকটি কথাও লিখতে পারেন। ঈশ্বর আপনার মনের কথা বোঝেন।
Prayer request form = প্রার্থনার অনুরোধ জানানোর ফর্ম
I give permission for the GPBC prayer team to pray for this request. = এই অনুরোধের জন্য প্রার্থনা করতে আমি GPBC প্রার্থনা দলকে অনুমতি দিচ্ছি।
Your information will be kept private and confidential. = আপনার তথ্য ব্যক্তিগত ও গোপন রাখা হবে।
We couldn't confirm that your prayer request was sent. Your text is still here. Please try again using Share My Prayer. = আপনার প্রার্থনার অনুরোধ পাঠানো হয়েছে কি না নিশ্চিত হওয়া যায়নি। আপনার লেখা এখানেই আছে। ‘প্রার্থনার অনুরোধ পাঠান’ বোতাম ব্যবহার করে আবার চেষ্টা করুন।
Share My Prayer = প্রার্থনার অনুরোধ পাঠান
No request is too small. All are welcome. = কোনো অনুরোধই তুচ্ছ নয়। সবাইকে স্বাগতম।
Thank You for Trusting Us with Your Request = আস্থা রেখে আপনার অনুরোধ জানানোর জন্য ধন্যবাদ
We are praying for you right now. You've taken a step of faith by reaching out, and we want you to know that you are deeply cared for. = আমরা এখনই আপনার জন্য প্রার্থনা করছি। যোগাযোগ করে আপনি বিশ্বাসের একটি পদক্ষেপ নিয়েছেন। জেনে রাখুন, আমরা আন্তরিকভাবে আপনার পাশে আছি।
What happens next: = এরপর যা হবে:
Our prayer team has received your request and is already bringing your needs before God. You are not forgotten, and you are not alone in this. = আমাদের প্রার্থনা দল আপনার অনুরোধ পেয়েছে এবং আপনার প্রয়োজন ঈশ্বরের কাছে তুলে ধরছে। আপনাকে আমরা ভুলে যাইনি; এই পথে আপনি একা নন।
May you feel God's presence and peace in the days ahead. We're here for you. = সামনের দিনগুলোতে আপনি ঈশ্বরের উপস্থিতি ও শান্তি অনুভব করুন। আমরা আপনার পাশে আছি।
Submit Another Request = আরেকটি অনুরোধ জানান
Return Home = প্রথম পাতায় ফিরুন
What Happens Next = এরপর যা হবে
We Pray Immediately = আমরা এখনই প্রার্থনা করি
Your request goes directly to our dedicated prayer team. You'll be in our prayers today and in the days to come. = আপনার অনুরোধ সরাসরি আমাদের প্রার্থনা দলের কাছে পৌঁছায়। আজ এবং সামনের দিনগুলোতেও আমরা আপনার জন্য প্রার্থনা করব।
We Handle with Care = আমরা যত্নের সঙ্গে গ্রহণ করি
Your request is treated with complete confidentiality and respect. We honor your trust by handling every prayer with sensitivity and love. = আপনার অনুরোধ সম্পূর্ণ গোপনীয়তা ও সম্মানের সঙ্গে গ্রহণ করা হয়। প্রতিটি অনুরোধ সংবেদনশীলতা ও ভালোবাসার সঙ্গে গ্রহণ করে আমরা আপনার আস্থার মর্যাদা রাখি।
We Walk with You = আমরা আপনার সঙ্গে পথ চলি
If you've shared contact info, we may reach out to check on you or offer encouragement. You're part of our church family. = যোগাযোগের তথ্য দিলে আপনার খোঁজ নিতে বা উৎসাহ দিতে আমরা যোগাযোগ করতে পারি। আপনি আমাদের মণ্ডলী-পরিবারের অংশ।
Pastoral Care = পাস্টরীয় পরিচর্যা
Need Someone to Talk To? = কারও সঙ্গে কথা বলতে চান?
If you need pastoral care or would simply like to talk with someone, please don't hesitate to reach out. We're here for you. = পাস্টরের পরিচর্যা প্রয়োজন হলে বা কারও সঙ্গে কথা বলতে চাইলে নির্দ্বিধায় যোগাযোগ করুন। আমরা আপনার পাশে আছি।
Crisis support: = জরুরি সহায়তা:
If you are in immediate danger or need urgent help, please contact local emergency services or call/text the = আপনি তাৎক্ষণিক বিপদে থাকলে বা জরুরি সহায়তা প্রয়োজন হলে স্থানীয় জরুরি সেবায় যোগাযোগ করুন অথবা ফোন/বার্তা পাঠান
You matter. = আপনি মূল্যবান।
You are loved. = আপনাকে ভালোবাসা হয়।
You are never alone. = আপনি কখনো একা নন।
“Cast all your anxiety on Him because He cares for you.” = “তোমাদের সমস্ত ভাবনার ভার তাঁহার উপরে ফেলিয়া দেও; কেননা তিনি তোমাদের জন্য চিন্তা করেন।”
1 Peter 5:7 = ১ পিতর ৫:৭
Featured Bible verse = নির্বাচিত বাইবেলের পদ
Warm candlelight over an open Bible in a quiet devotional setting = শান্ত ধ্যানের পরিবেশে খোলা বাইবেলের ওপর মোমবাতির উষ্ণ আলো
A quiet devotional table with a Bible and candle = বাইবেল ও মোমবাতি সাজানো শান্ত ধ্যানের টেবিল
`),
  '/give': rows(`
Generosity, with purpose. = মহৎ উদ্দেশ্যে উদারতা।
Give with purpose. = ঈশ্বরের কাজে দান করুন।
Your generosity helps our church worship God, care for people, and share the Gospel—locally and beyond. = আপনার উদারতা আমাদের মণ্ডলীকে ঈশ্বরের উপাসনা করতে, মানুষের যত্ন নিতে এবং আমাদের সমাজে ও তার বাইরেও সুসমাচার পৌঁছে দিতে সাহায্য করে।
Support worship and community. = উপাসনা ও সহভাগিতায় সহায়তা করুন।
Your gift = আপনার দান
Give once through PayPal. = PayPal-এর মাধ্যমে এককালীন দান করুন।
Gift frequency = দানের নিয়ম
One time = এককালীন
A one-time gift = এককালীন দান
Choose your amount on PayPal. = PayPal-এ দানের পরিমাণ বেছে নিন।
Give once, with no recurring commitment. = নিয়মিত দানের কোনো অঙ্গীকার ছাড়াই একবার দান করুন।
No payment details are collected on this site. = এই সাইটে অর্থপ্রদানের কোনো তথ্য সংগ্রহ করা হয় না।
Continue to PayPal = PayPal-এ এগিয়ে যান
You’ll review and confirm your gift on PayPal. = PayPal-এ আপনি দানের তথ্য দেখে নিশ্চিত করতে পারবেন।
Back to giving = দানের পাতায় ফিরুন
Receipts & giving help = রসিদ ও দানসংক্রান্ত সহায়তা
Thank you for being part of this ministry. = এই পরিচর্যার অংশ হওয়ার জন্য আপনাকে ধন্যবাদ।
Small acts. Shared impact. = ছোট ছোট উদ্যোগ। সবার জীবনে কল্যাণ।
Worship & discipleship = উপাসনা ও শিষ্যত্ব
Prayer, teaching, and worship in the life of our local church. = আমাদের স্থানীয় মণ্ডলীর জীবনে প্রার্থনা, শিক্ষা ও উপাসনা।
Community & mission = সমাজসেবা ও মিশন
Care for families and neighbors, and Gospel-centered ministry beyond. = পরিবার ও প্রতিবেশীদের যত্ন এবং আরও মানুষের কাছে সুসমাচারকেন্দ্রিক পরিচর্যা পৌঁছে দেওয়া।
Prefer another way to give? = অন্যভাবে দান করতে চান?
Contact the church for current giving details. = দানের বর্তমান ব্যবস্থা জানতে মণ্ডলীর সঙ্গে যোগাযোগ করুন।
Ask the church → = মণ্ডলীর সঙ্গে যোগাযোগ করুন →
2 Corinthians 9:7 = ২ করিন্থীয় ৯:৭
`),
  '/calendar': rows(`
Church Calendar = মণ্ডলীর দিনপঞ্জি
View all upcoming services, events, prayer meetings, and special celebrations. Stay connected with our church community. = আসন্ন উপাসনা, আয়োজন, প্রার্থনা সভা ও বিশেষ উৎসবের সব খবর দেখুন। আমাদের মণ্ডলী-পরিবারের সঙ্গে যুক্ত থাকুন।
Sunday Services = রবিবারের উপাসনা
All Events = সব আয়োজন
Prayer Meetings = প্রার্থনা সভা
Special Christian Days = বিশেষ খ্রীষ্টীয় দিবস
Print = ছাপান
Download = ডাউনলোড করুন
Share = শেয়ার করুন
More Filters ▾ = আরও বাছাই ▾
Advanced event category filters = আয়োজনের ধরন অনুযায়ী বাছাই
GPBC Events = GPBC-র আয়োজন
Christian = খ্রীষ্টীয়
Bangladeshi = বাংলাদেশি
American = মার্কিন
Special Days = বিশেষ দিন
american = মার্কিন
‹ Previous = ‹ আগের মাস
Next › = পরের মাস ›
Sun = রবি
Mon = সোম
Tue = মঙ্গল
Wed = বুধ
Thu = বৃহস্পতি
Fri = শুক্র
Sat = শনি
Holy Communion Service = প্রভুর ভোজের উপাসনা
First Sunday of Advent = আগমনকালের প্রথম রবিবার
Events This Month = এ মাসের আয়োজন
First-Time Visitor Friendly = প্রথমবার আসা অতিথিদের জন্য উপযোগী
Our Weekly Schedule = আমাদের সাপ্তাহিক সময়সূচি
Join us for worship, fellowship, and spiritual growth = উপাসনা, সহভাগিতা ও আত্মিক বৃদ্ধির জন্য আমাদের সঙ্গে যোগ দিন
Annual Special Services = বছরের বিশেষ উপাসনা
Palm Sunday = খর্জুর রবিবার
Good Friday = পুণ্য শুক্রবার
Easter = পুনরুত্থান রবিবার
Upcoming Special Events = আসন্ন বিশেষ আয়োজন
Special celebrations and gatherings = বিশেষ উৎসব ও সমাবেশ
Mobile Access = মুঠোফোনে দেখুন
Scan to access the GPBC calendar on your phone = মুঠোফোনে GPBC-র দিনপঞ্জি দেখতে স্ক্যান করুন
Upcoming Event Reminders = আসন্ন আয়োজনের স্মারক
Reminders are shown 2 months before each event = প্রতিটি আয়োজনের দুই মাস আগে থেকে স্মারক দেখানো হয়
Delete Event = আয়োজন মুছুন
Quick filter presets = আয়োজন বাছাইয়ের সহজ উপায়
Calendar actions = দিনপঞ্জির বিকল্পসমূহ
Print calendar = দিনপঞ্জি ছাপান
Download calendar as image = ছবি হিসেবে দিনপঞ্জি ডাউনলোড করুন
Share calendar events = দিনপঞ্জির আয়োজন শেয়ার করুন
Filter events by category = ধরন অনুযায়ী আয়োজন বাছাই করুন
Show GPBC events = GPBC-র আয়োজন দেখুন
Show Christian events = খ্রীষ্টীয় আয়োজন দেখুন
Show Bangladeshi events = বাংলাদেশি আয়োজন দেখুন
Show American events = মার্কিন আয়োজন দেখুন
Show Special Days events = বিশেষ দিনের আয়োজন দেখুন
Calendar month navigation = দিনপঞ্জির মাস বেছে নিন
Go to previous month = আগের মাসে যান
Go to next month = পরের মাসে যান
Monthly calendar view = মাসের দিনপঞ্জি
Close reminder modal = স্মারকের জানালা বন্ধ করুন
Close event details modal = আয়োজনের বিস্তারিত বন্ধ করুন
`),
  '/about': rows(`
A church family shaped by grace. = অনুগ্রহে গড়ে ওঠা এক মণ্ডলী-পরিবার।
Serving the Bangladeshi community in California and welcoming all who seek to worship God with passion and serve people with compassion. = ক্যালিফোর্নিয়ার বাংলাদেশি সমাজের সেবায় নিয়োজিত আমাদের মণ্ডলী, যারা আন্তরিকভাবে ঈশ্বরের উপাসনা ও মমতায় মানুষের সেবা করতে চান, তাঁদের সবাইকে স্বাগত জানায়।
Explore our story = আমাদের কথা জানুন
Bangladeshi roots = বাংলাদেশি শিকড়
Southern California = দক্ষিণ ক্যালিফোর্নিয়া
Christ-centered community = খ্রীষ্টকেন্দ্রিক পরিবার
Worship, heritage, and hope—together. = উপাসনা, ঐতিহ্য ও আশায়—একসঙ্গে।
Begin the journey = পথচলা শুরু করুন
About GPBC = GPBC সম্পর্কে
Who we are = আমাদের পরিচয়
Our story = আমাদের কথা
Why we exist = আমাদের উদ্দেশ্য
What we believe = আমাদের বিশ্বাস
Our people = আমাদের মানুষ
What we value = আমাদের মূল্যবোধ
A spiritual home for the Bangladeshi community—and a welcoming church family for all. = বাংলাদেশি সমাজের জন্য এক আত্মিক নিবাস—আর সবার জন্য এক আপন মণ্ডলী-পরিবার।
We are a vibrant Christian community where people worship, grow, and serve together. Our Bangladeshi roots are part of our story; our welcome is wider than our heritage. = আমরা এক প্রাণবন্ত খ্রীষ্টীয় পরিবার, যেখানে সবাই একসঙ্গে উপাসনা করে, বেড়ে ওঠে ও সেবা করে। বাংলাদেশি শিকড় আমাদের পরিচয়ের অংশ; তবে আমাদের অভ্যর্থনা কোনো সীমানায় আবদ্ধ নয়।
Grace and Praise Bangladeshi Church was founded with a vision to create a spiritual home for the Bangladeshi community in California. We continue to welcome families from all backgrounds who seek to grow in their faith and serve God together. = ক্যালিফোর্নিয়ার বাংলাদেশি সমাজের জন্য একটি আত্মিক নিবাস গড়ার দর্শন নিয়ে Grace and Praise Bangladeshi Church প্রতিষ্ঠিত হয়। বিশ্বাসে বেড়ে উঠতে ও একসঙ্গে ঈশ্বরের সেবা করতে আগ্রহী সব পটভূমির পরিবারকে আমরা আজও স্বাগত জানাই।
Read our history = আমাদের ইতিহাস পড়ুন
“Passion for God, Compassion for People” = “ঈশ্বরের জন্য আন্তরিকতা, মানুষের জন্য মমতা”
The simple phrase that gathers our worship, our service, and our life together. = এই সহজ কথাটিই আমাদের উপাসনা, সেবা ও একসঙ্গে পথচলাকে ধারণ করে।
Rooted in heritage. Alive in worship. = ঐতিহ্যে শিকড়। উপাসনায় প্রাণ।
Where we came from = আমাদের শুরুর কথা
From a small gathering to a thriving spiritual family. = ছোট্ট এক সমাবেশ থেকে এক বিকশিত আত্মিক পরিবার।
Our journey began with a small group of believers who gathered to worship God and celebrate their cultural heritage. Over time, GPBC has grown into a community that embraces both Bangladeshi roots and life as followers of Christ. = ঈশ্বরের উপাসনা ও নিজেদের সাংস্কৃতিক ঐতিহ্যে অংশ নিতে একত্র হওয়া অল্প কয়েকজন বিশ্বাসীকে নিয়ে আমাদের পথচলা শুরু। সময়ের সঙ্গে GPBC এমন এক পরিবার হয়ে উঠেছে, যেখানে বাংলাদেশি শিকড় ও খ্রীষ্টের অনুসারী হিসেবে জীবন—দুটিই আপন করে নেওয়া হয়।
A place to gather = একত্র হওয়ার স্থান
Believers found a spiritual home in shared worship. = একসঙ্গে উপাসনার মধ্য দিয়ে বিশ্বাসীরা আত্মিক নিবাস খুঁজে পেয়েছেন।
A faith to grow in = বিশ্বাসে বেড়ে ওঠার সুযোগ
Families grew together through worship, teaching, and service. = উপাসনা, শিক্ষা ও সেবার মধ্য দিয়ে পরিবারগুলো একসঙ্গে বেড়ে উঠেছে।
A welcome to extend = সবার জন্য অভ্যর্থনা
The church continues to welcome people from every background. = সব পটভূমির মানুষকে মণ্ডলী আজও স্বাগত জানায়।
Spend time with the full story = আমাদের সম্পূর্ণ ইতিহাস পড়ুন
Faith that becomes worship, discipleship, and compassionate service. = উপাসনা, শিষ্যত্ব ও মমতাপূর্ণ সেবায় প্রকাশিত বিশ্বাস।
We glorify God by making disciples who love Jesus, love each other, and love our community. = যীশুকে, একে অন্যকে ও আমাদের সমাজকে ভালোবাসেন—এমন শিষ্য গড়ে তুলে আমরা ঈশ্বরের গৌরব করি।
Explore mission & vision = আমাদের লক্ষ্য ও দর্শন জানুন
Our commitments = আমাদের অঙ্গীকার
Worship God with all our hearts in English and Bangla. = বাংলা ও ইংরেজিতে সমস্ত হৃদয় দিয়ে ঈশ্বরের উপাসনা করা।
Build strong, Christ-centered families. = শক্তিশালী, খ্রীষ্টকেন্দ্রিক পরিবার গড়ে তোলা।
Equip believers for ministry and service. = পরিচর্যা ও সেবার জন্য বিশ্বাসীদের প্রস্তুত করা।
Reach our community with the Gospel of Jesus Christ. = যীশু খ্রীষ্টের সুসমাচার আমাদের সমাজে পৌঁছে দেওয়া।
Our vision = আমাদের দর্শন
A church where every person experiences the transforming love of Jesus Christ. = এমন এক মণ্ডলী, যেখানে প্রত্যেকে যীশু খ্রীষ্টের জীবন-রূপান্তরকারী ভালোবাসা অনুভব করেন।
We envision a church where cultural diversity is celebrated and faith is lived out through authentic worship, biblical teaching, and compassionate service. = আমরা এমন এক মণ্ডলীর স্বপ্ন দেখি, যেখানে সাংস্কৃতিক বৈচিত্র্যকে সম্মান করা হয় এবং আন্তরিক উপাসনা, বাইবেলের শিক্ষা ও মমতাপূর্ণ সেবায় বিশ্বাস প্রকাশ পায়।
The truths that guide our faith and life together. = যে সত্য আমাদের বিশ্বাস ও একসঙ্গে পথচলাকে দিশা দেয়।
Our beliefs are not a checklist; they are the foundation beneath our worship, our teaching, and our hope. = আমাদের বিশ্বাস কোনো তালিকামাত্র নয়; তা আমাদের উপাসনা, শিক্ষা ও আশার ভিত্তি।
Read all our beliefs = আমাদের বিশ্বাস সম্পর্কে বিস্তারিত পড়ুন
The Bible = বাইবেল
We believe the Bible is the inspired, infallible Word of God and our ultimate authority for faith and life. = আমরা বিশ্বাস করি, বাইবেল ঈশ্বরের অনুপ্রাণিত, নির্ভুল বাক্য এবং বিশ্বাস ও জীবনের চূড়ান্ত কর্তৃত্ব।
The Trinity = ত্রিত্ব
We believe in one God eternally existing in three persons: Father, Son, and Holy Spirit. = আমরা এক ঈশ্বরে বিশ্বাস করি, যিনি পিতা, পুত্র ও পবিত্র আত্মা—এই তিন ব্যক্তিসত্তায় অনন্তকাল বিদ্যমান।
Jesus Christ = যীশু খ্রীষ্ট
We believe Jesus Christ is the Son of God, born of a virgin, lived a sinless life, died for our sins, rose from the dead, and will return again. = আমরা বিশ্বাস করি, যীশু খ্রীষ্ট ঈশ্বরের পুত্র। তিনি কুমারীর গর্ভে জন্ম নিয়েছেন, নিষ্পাপ জীবনযাপন করেছেন, আমাদের পাপের জন্য মৃত্যুবরণ করেছেন, মৃতদের মধ্য থেকে পুনরুত্থিত হয়েছেন এবং আবার ফিরে আসবেন।
Salvation = পরিত্রাণ
We believe salvation is by grace alone, through faith alone, in Christ alone. = আমরা বিশ্বাস করি, পরিত্রাণ কেবল অনুগ্রহে, কেবল বিশ্বাসের মাধ্যমে, কেবল খ্রীষ্টেতে পাওয়া যায়।
Who leads us = আমাদের পথপ্রদর্শক
People who shepherd with wisdom, love, and integrity. = যাঁরা প্রজ্ঞা, ভালোবাসা ও সততায় মণ্ডলীর পরিচর্যা করেন।
Our church is led by a dedicated team of pastors and leaders who guide us in worship, teaching, and ministry. Meet Rev. Gilbert Simon Baidya, PhD, our founding pastor, and learn more about the calling behind his service. = একনিষ্ঠ পাস্টর ও নেতৃবৃন্দ আমাদের মণ্ডলীকে উপাসনা, শিক্ষা ও পরিচর্যায় পরিচালনা করেন। আমাদের প্রতিষ্ঠাতা পাস্টর Rev. Gilbert Simon Baidya, PhD-এর সঙ্গে পরিচিত হোন এবং তাঁর সেবার আহ্বান সম্পর্কে জানুন।
Founding Pastor = প্রতিষ্ঠাতা পাস্টর
Meet our pastor = আমাদের পাস্টরকে জানুন
Explore church leadership = মণ্ডলীর নেতৃত্ব সম্পর্কে জানুন
Serving together for the good of the church family. = মণ্ডলী-পরিবারের কল্যাণে একসঙ্গে সেবা।
The practices that shape our life together. = যে চর্চা আমাদের একসঙ্গে পথচলাকে গড়ে তোলে।
These values guide our worship, our relationships, and our service to God and others. = এই মূল্যবোধ আমাদের উপাসনা, সম্পর্ক এবং ঈশ্বর ও মানুষের সেবায় দিশা দেয়।
Worship = উপাসনা
We worship God with passion and authenticity in both English and Bangla. = আমরা বাংলা ও ইংরেজিতে আন্তরিকতা ও সত্যনিষ্ঠায় ঈশ্বরের উপাসনা করি।
Word = ঈশ্বরের বাক্য
We are committed to biblical teaching and learning God’s Word. = আমরা বাইবেলের শিক্ষা ও ঈশ্বরের বাক্য শেখার প্রতি প্রতিশ্রুতিবদ্ধ।
Love = ভালোবাসা
We love God with all our hearts and love people unconditionally. = আমরা সমস্ত হৃদয় দিয়ে ঈশ্বরকে ভালোবাসি এবং মানুষকে শর্তহীনভাবে ভালোবাসি।
Community = সহভাগিতা
We build authentic relationships and support one another as family. = আমরা আন্তরিক সম্পর্ক গড়ে তুলি এবং পরিবার হিসেবে একে অন্যের পাশে দাঁড়াই।
Outreach = সুসমাচার ও সেবা
We reach out to our community and the world with the Gospel of Jesus. = আমরা যীশুর সুসমাচার নিয়ে আমাদের সমাজ ও জগতের মানুষের কাছে যাই।
Excellence = উৎকর্ষ
We honor God by pursuing excellence in all we do. = আমাদের প্রতিটি কাজে উৎকর্ষ সাধনের মধ্য দিয়ে আমরা ঈশ্বরকে সম্মান করি।
See all our core values = আমাদের সব মূল্যবোধ দেখুন
How God is working = ঈশ্বরের কাজের সাক্ষ্য
A church is made of stories. = মানুষের জীবনের সাক্ষ্যেই মণ্ডলীর পরিচয়।
Hear the stories of faith, hope, and transformation already shared by our GPBC family. = আমাদের GPBC পরিবারের বিশ্বাস, আশা ও জীবন-রূপান্তরের সাক্ষ্য শুনুন।
Member since 2020 = ২০২০ সাল থেকে সদস্য
Member since 2021 = ২০২১ সাল থেকে সদস্য
Coming to GPBC has transformed my life. I found not just a church, but a family who speaks my language and understands my culture. The Lord has used this community to strengthen my faith and give me hope during difficult times. Praise God! = GPBC-তে এসে আমার জীবন বদলে গেছে। আমি শুধু একটি মণ্ডলী নয়, এমন এক পরিবার পেয়েছি, যারা আমার ভাষায় কথা বলে ও আমার সংস্কৃতি বোঝে। এই পরিবারের মাধ্যমে প্রভু আমার বিশ্বাসকে দৃঢ় করেছেন এবং কঠিন সময়ে আমাকে আশা দিয়েছেন। ঈশ্বরের প্রশংসা হোক!
GPBC is a place where I can grow in my relationship with God while connecting with others who share my faith and cultural background. I’m grateful for the friendships and spiritual growth I’ve experienced here. = GPBC এমন এক স্থান, যেখানে আমার বিশ্বাস ও সাংস্কৃতিক পটভূমির মানুষের সঙ্গে সম্পর্ক গড়ার পাশাপাশি ঈশ্বরের সঙ্গে সম্পর্কেও বেড়ে উঠতে পারি। এখানে পাওয়া বন্ধুত্ব ও আত্মিক বৃদ্ধির জন্য আমি কৃতজ্ঞ।
Read more testimonies = আরও সাক্ষ্য পড়ুন
Go deeper = আরও জানুন
Resources for the life we share. = আমাদের একসঙ্গে পথচলার উপকরণ।
Position papers = বিশ্বাস ও চর্চা সম্পর্কে আমাদের অবস্থান
Detailed statements on key doctrinal and practical positions. = গুরুত্বপূর্ণ বিশ্বাসগত ও ব্যবহারিক বিষয়ে আমাদের অবস্থানের বিস্তারিত বিবৃতি।
GPBC Song Book = GPBC গানের সংকলন
Worship songs in English and Bangla for the songs we carry together. = একসঙ্গে উপাসনার জন্য বাংলা ও ইংরেজি গানের সংকলন।
Come experience GPBC = GPBC-তে এসে দেখুন
There is room for you in this family. = এই পরিবারে আপনারও স্থান আছে।
We would love to welcome you to our church family. Come experience worship, fellowship, and God’s love in action. = আপনাকে আমাদের মণ্ডলী-পরিবারে স্বাগত জানাতে আমরা আনন্দিত হব। আসুন, উপাসনা, সহভাগিতা এবং সেবায় প্রকাশিত ঈশ্বরের ভালোবাসার অভিজ্ঞতা নিন।
View the calendar = দিনপঞ্জি দেখুন
`),
  '/contact': rows(`
We'd love to hear from you. Reach out anytime. = আপনার কথা শুনতে আমরা আগ্রহী। যেকোনো সময় যোগাযোগ করুন।
Location = ঠিকানা
Sunday Worship: = রবিবারের উপাসনা:
Saturday Fasting Prayer: = শনিবার উপবাস ও প্রার্থনা:
Friday Instrument Lesson: = শুক্রবার বাদ্যযন্ত্রের পাঠ:
Friday Worship Practice: = শুক্রবার উপাসনার অনুশীলন:
Get In Touch = যোগাযোগ করুন
Phone: = ফোন:
Email: = ইমেইল:
Follow us on social media for updates and encouragement. = খবর ও উৎসাহ পেতে সামাজিক যোগাযোগমাধ্যমে আমাদের সঙ্গে যুক্ত থাকুন।
Submit a Prayer Request = প্রার্থনার অনুরোধ জানান
`),
  '/ministries': rows(`
Life together at GPBC = GPBC-তে একসঙ্গে পথচলা
Our Ministries = আমাদের পরিচর্যা
Worship together. Grow in Christ. Serve with compassion. Reach our community with hope. = একসঙ্গে উপাসনা করুন। খ্রীষ্টেতে বেড়ে উঠুন। মমতায় সেবা করুন। সমাজের কাছে আশার বাণী নিয়ে যান।
A place to belong and take part = আপন হয়ে অংশ নেওয়ার স্থান
Belong = আপন হয়ে উঠুন
Grow = বেড়ে উঠুন
Serve = সেবা করুন
Reach = মানুষের কাছে যান
Ministry at GPBC = GPBC-তে পরিচর্যা
Faith becomes life when we share it. = একসঙ্গে ভাগ করে নিলেই বিশ্বাস জীবনে প্রকাশ পায়।
Ministry is where our church family worships, grows in God’s Word, serves one another, and reaches beyond our walls with the love of Christ. There is room for your gifts, your questions, and your next step. = পরিচর্যার মধ্য দিয়ে আমাদের মণ্ডলী-পরিবার উপাসনা করে, ঈশ্বরের বাক্যে বেড়ে ওঠে, একে অন্যের সেবা করে এবং খ্রীষ্টের ভালোবাসা নিয়ে বাইরের মানুষের কাছে যায়। এখানে আপনার দান, আপনার প্রশ্ন ও আপনার পরবর্তী পদক্ষেপের স্থান আছে।
Featured ministry = বিশেষ পরিচর্যা
Praise that gathers us = যে প্রশংসায় আমরা একত্র হই
Our worship life makes space for prayer, music, Scripture, and wholehearted praise. = আমাদের উপাসনায় রয়েছে প্রার্থনা, সংগীত, শাস্ত্রপাঠ ও সমস্ত হৃদয় দিয়ে প্রশংসার সুযোগ।
Serving God through worship, music, prayer, and praise as one church family. Whether you bring musical gifts or simply a heart ready to worship, this ministry invites you to help create a space where Christ is honored. = এক মণ্ডলী-পরিবার হিসেবে উপাসনা, সংগীত, প্রার্থনা ও প্রশংসায় ঈশ্বরের সেবা করি। আপনার সংগীতের দান থাকুক বা কেবল উপাসনায় প্রস্তুত হৃদয়—খ্রীষ্টকে সম্মান করার পরিবেশ গড়তে এই পরিচর্যায় আপনাকে আমন্ত্রণ।
Explore Praise & Worship = প্রশংসা ও উপাসনা সম্পর্কে জানুন
Find your place = আপনার স্থান খুঁজে নিন
Ministry for every season of life = জীবনের প্রতিটি পর্যায়ের জন্য পরিচর্যা
Explore the active ministry areas and learn how GPBC serves as one church family. = আমাদের চলমান পরিচর্যাগুলো জানুন এবং দেখুন কীভাবে GPBC এক পরিবার হিসেবে সেবা করে।
Gather & Grow = একত্র হোন ও বেড়ে উঠুন
Care & Serve = যত্ন নিন ও সেবা করুন
Reach & Partner = মানুষের কাছে যান ও সহযোগী হোন
Kids & Families = শিশু ও পরিবার
Take a next step = পরবর্তী পদক্ষেপ নিন
Not sure where to begin? = কোথা থেকে শুরু করবেন বুঝতে পারছেন না?
We would love to help you find a ministry community that fits your season and gifts. = আপনার জীবনের পর্যায় ও দানের সঙ্গে মানানসই পরিচর্যার পরিবার খুঁজে পেতে আমরা সাহায্য করতে আগ্রহী।
Get connected = যুক্ত হোন
`)
};

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const bengaliMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const bengaliWeekdays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const digits = text => text.replace(/\d/g, digit => '০১২৩৪৫৬৭৮৯'[digit]);
const lookup = (dictionary, key) => dictionary && Object.hasOwn(dictionary, key) ? dictionary[key] : null;

export function translate(text, identity) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  const dictionary = lookup(pages, identity);
  if (!dictionary) return null;
  const exact = lookup(dictionary, normalized) || lookup(common, normalized);
  if (exact) return exact;
  const prefix = normalized.match(/^[^\p{Letter}\p{Number}]+/u)?.[0] || '';
  const label = normalized.slice(prefix.length);
  const decorated = lookup(dictionary, label) || lookup(common, label);
  if (decorated) return prefix + decorated;
  const date = normalized.match(/^(?:([A-Za-z]+),\s+)?([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  const month = date && months.findIndex(name => name === date[2] || name.slice(0, 3) === date[2]);
  if (date && month >= 0) {
    const weekday = weekdays.findIndex(name => name === date[1] || name.slice(0, 3) === date[1]);
    return (weekday >= 0 ? bengaliWeekdays[weekday] + ', ' : '') +
      digits(date[3]) + ' ' + bengaliMonths[month] + (date[4] ? ', ' + digits(date[4]) : '');
  }
  const monthYear = normalized.match(/^([A-Za-z]+) (\d{4})$/);
  const monthIndex = monthYear && months.indexOf(monthYear[1]);
  if (monthYear && monthIndex >= 0) return bengaliMonths[monthIndex] + ' ' + digits(monthYear[2]);
  const dateTime = normalized.match(/^(.+) at (\d{1,2}:\d{2} [AP]M) PT$/);
  if (dateTime && lookup(common, dateTime[2])) {
    const dateLabel = translate(dateTime[1], identity);
    if (dateLabel) return dateLabel + ', ' + common[dateTime[2]] + ' (প্যাসিফিক সময়)';
  }
  const activeSide = normalized.match(/^Active side: ([^.]+)\. (.+)$/);
  if (activeSide && lookup(dictionary, activeSide[1]) && lookup(dictionary, activeSide[2])) {
    return 'সক্রিয় অংশ: ' + dictionary[activeSide[1]] + '। ' + dictionary[activeSide[2]];
  }
  return null;
}

const attributeTranslations = new WeakMap();
const renderedLanguage = new WeakMap();
const reverse = new Map(Object.entries(pages).map(([identity, dictionary]) => [
  identity, new Map(Object.entries({ ...common, ...dictionary }).map(([en, bn]) => [bn, en]))
]));

export function applyDraft(document, identity, language) {
  if (!pages[identity]) return;
  for (const selector of ['.gpbc-lang-en', '.gpbc-lang-bn', '[data-loop-text]', '[data-lng]']) {
    for (const element of document.querySelectorAll(selector)) {
      const lang = element.dataset.loopText || element.dataset.lng ||
        (element.classList.contains('gpbc-lang-bn') ? 'bn' : 'en');
      if (!element.hasAttribute('data-lang')) element.dataset.lang = lang;
    }
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.parentElement.closest('script, style, noscript, svg, textarea, input, select, option, code, pre, [contenteditable], [data-lang], [data-bangla-text], [data-en][data-bn], [data-bangla-exclude]')) continue;
    const normalized = node.textContent.trim().replace(/\s+/g, ' ');
    const english = reverse.get(identity).get(normalized);
    const translated = english ? normalized : translate(node.textContent, identity);
    if (!translated) continue;
    const target = node.parentElement.matches('.footer-nav-title') && node.parentElement.childNodes.length === 1
      ? node.parentElement : document.createElement('span');
    target.dataset.banglaText = '';
    target.dataset.en = english || node.textContent;
    target.dataset.bn = node.textContent.match(/^\s*/)[0] + translated + node.textContent.match(/\s*$/)[0];
    if (target !== node.parentElement) node.replaceWith(target);
  }
  for (const element of document.querySelectorAll('[data-bangla-text]')) {
    if (element.closest('[data-bangla-exclude]')) continue;
    const text = element.dataset[language];
    if (renderedLanguage.get(element) !== language) {
      element.textContent = text;
      renderedLanguage.set(element, language);
    }
    if (element.lang !== language) element.lang = language;
  }
  for (const element of document.querySelectorAll('[placeholder], [aria-label], [title]')) {
    if (element.closest('[contenteditable], [data-lang], [data-site-language], [data-bangla-exclude]')) continue;
    let saved = attributeTranslations.get(element);
    if (!saved) { saved = new Map(); attributeTranslations.set(element, saved); }
    for (const attribute of ['placeholder', 'aria-label', 'title']) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      let pair = saved.get(attribute);
      if (!pair || value !== pair.en && value !== pair.bn) {
        const translated = translate(value, identity);
        if (!translated) continue;
        pair = { en: value, bn: translated };
        saved.set(attribute, pair);
      }
      if (value !== pair[language]) element.setAttribute(attribute, pair[language]);
      if (element.matches('input, textarea, button, a, [role="img"], [role="group"], [role="grid"], [role="gridcell"]') &&
          element.lang !== language) element.lang = language;
    }
  }
}
