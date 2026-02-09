// Complete Google Apps Script for Grace and Praise Bangladeshi Church Calendar
// This script handles all backend operations for the church calendar website

function doGet(e) {
  // Handle direct browser access - default to getEvents
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const eventsSheet = ss.getSheetByName('Events') || ss.getSheets()[0];
  
  // If there's an action parameter, use it
  if (e.parameter && e.parameter.action) {
    return doPost(e);
  }
  
  // Default: return events for browser access
  return getEvents(eventsSheet);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const eventsSheet = ss.getSheetByName('Events') || ss.getSheets()[0];
  
  let data;
  try {
    // Try to parse POST data
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    } else {
      return createJsonResponse({ error: 'No data received' });
    }
  } catch (error) {
    return createJsonResponse({ error: 'Parse error: ' + error.toString() });
  }
  
  try {
    // Get all events
    if (data.action === 'getEvents') {
      return getEvents(eventsSheet);
    }
    
    // Add new event
    if (data.action === 'addEvent') {
      return addEvent(eventsSheet, data);
    }
    
    // Delete event
    if (data.action === 'deleteEvent') {
      return deleteEvent(eventsSheet, data);
    }
    
    // Add prayer request
    if (data.action === 'addPrayerRequest') {
      return addPrayerRequest(ss, data);
    }
    
    // Get all songs
    if (data.action === 'getSongs') {
      return getSongs(ss);
    }
    
    // Add new song
    if (data.action === 'addSong') {
      return addSong(ss, data);
    }
    
    // Add testimony
    if (data.action === 'addTestimony') {
      return addTestimony(ss, data);
    }
    
    return createJsonResponse({ 
      error: 'Unknown action: ' + data.action,
      receivedData: data
    });
    
  } catch (error) {
    return createJsonResponse({ error: 'Execution error: ' + error.toString() });
  }
}

function getEvents(sheet) {
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    // No events yet
    return createJsonResponse({ events: [] });
  }
  
  const range = sheet.getRange(2, 1, lastRow - 1, 9); // 9 columns including imageUrl
  const values = range.getValues();
  
  const events = values.map(row => ({
    date: typeof row[0] === 'object' ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd') : row[0],
    name: row[1],
    category: row[2],
    description: row[3] || '',
    addedBy: row[4] || '',
    contact: row[5] || '',
    owner: row[6] || '',
    timestamp: row[7] || '',
    imageUrl: row[8] || '' // Image URL from Cloudinary
  })).filter(event => event.date !== ''); // Filter empty rows
  
  return createJsonResponse({ events: events });
}

function addEvent(sheet, data) {
  const event = data.event;
  
  // Add new row with event data including imageUrl
  sheet.appendRow([
    event.date,                                      // Column A: Date
    event.name,                                      // Column B: Name
    event.category,                                  // Column C: Category
    event.description || '',                         // Column D: Description
    event.addedBy || '',                            // Column E: Added By
    event.contact || '',                            // Column F: Contact
    event.owner || '',                              // Column G: Owner
    event.timestamp || new Date().toISOString(),    // Column H: Timestamp
    event.imageUrl || ''                            // Column I: Image URL
  ]);
  
  return createJsonResponse({ success: true, message: 'Event added successfully' });
}

function deleteEvent(sheet, data) {
  const eventToDelete = data.event;
  const owner = data.owner;
  const lastRow = sheet.getLastRow();
  
  // Search for the event
  for (let i = 2; i <= lastRow; i++) {
    const row = sheet.getRange(i, 1, 1, 9).getValues()[0]; // Read 9 columns
    const rowDate = typeof row[0] === 'object' ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd') : row[0];
    
    if (rowDate === eventToDelete.date && 
        row[1] === eventToDelete.name &&
        row[6] === owner) {
      // Found the event and owner matches
      sheet.deleteRow(i);
      
      return createJsonResponse({ success: true, message: 'Event deleted successfully' });
    }
  }
  
  return createJsonResponse({ success: false, message: 'Event not found or permission denied' });
}

function addPrayerRequest(ss, data) {
  // Get or create Prayer Requests sheet
  let prayerSheet = ss.getSheetByName('Prayer Requests');
  if (!prayerSheet) {
    prayerSheet = ss.insertSheet('Prayer Requests');
    // Add headers
    prayerSheet.appendRow([
      'Timestamp',
      'Name',
      'Is Anonymous',
      'Categories',
      'Prayer Details',
      'Status'
    ]);
    // Format header row
    const headerRange = prayerSheet.getRange(1, 1, 1, 6);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#9b59b6');
    headerRange.setFontColor('white');
  }
  
  const prayer = data.prayer;
  const timestamp = new Date().toLocaleString();
  
  prayerSheet.appendRow([
    timestamp,
    prayer.name,
    prayer.isAnonymous ? 'Yes' : 'No',
    prayer.categories,
    prayer.details,
    prayer.status || 'Active'
  ]);
  
  return createJsonResponse({ success: true, message: 'Prayer request added successfully' });
}

function getSongs(ss) {
  // Get or create Songs sheet
  let songsSheet = ss.getSheetByName('Songs');
  if (!songsSheet) {
    songsSheet = ss.insertSheet('Songs');
    // Add headers
    songsSheet.appendRow([
      'ID',
      'Title',
      'Language',
      'Category',
      'Key',
      'Tempo',
      'Preview',
      'Lyrics',
      'Chords',
      'Submitted By',
      'Timestamp'
    ]);
    // Format header row
    const headerRange = songsSheet.getRange(1, 1, 1, 11);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#667eea');
    headerRange.setFontColor('white');
    
    // Add sample songs
    addSampleSongs(songsSheet);
  }
  
  const lastRow = songsSheet.getLastRow();
  
  if (lastRow <= 1) {
    return createJsonResponse({ songs: [] });
  }
  
  const range = songsSheet.getRange(2, 1, lastRow - 1, 11);
  const values = range.getValues();
  
  const songs = values.map(row => ({
    id: row[0],
    title: row[1],
    language: row[2],
    category: row[3],
    key: row[4] || null,
    tempo: row[5] || null,
    preview: row[6],
    lyrics: row[7],
    chords: row[8] ? row[8].split(',').map(c => c.trim()) : [],
    submittedBy: row[9],
    timestamp: row[10]
  })).filter(song => song.title !== '');
  
  return createJsonResponse({ songs: songs });
}

function addSong(ss, data) {
  let songsSheet = ss.getSheetByName('Songs');
  if (!songsSheet) {
    // Create sheet if it doesn't exist
    getSongs(ss);
    songsSheet = ss.getSheetByName('Songs');
  }
  
  const song = data.song;
  const lastRow = songsSheet.getLastRow();
  const newId = lastRow > 1 ? songsSheet.getRange(lastRow, 1).getValue() + 1 : 1;
  
  songsSheet.appendRow([
    newId,
    song.title,
    song.language,
    song.category,
    song.key || '',
    song.tempo || '',
    song.preview || '',
    song.lyrics,
    Array.isArray(song.chords) ? song.chords.join(', ') : song.chords || '',
    song.submittedBy,
    new Date().toLocaleString()
  ]);
  
  return createJsonResponse({ success: true, message: 'Song added successfully', id: newId });
}

function addSampleSongs(sheet) {
  const samples = [
    [1, "প্রভু যীশু আমার পরিত্রাতা (Prabhu Yeshu Amar Poritrata)", "bangla", "worship", "G", "Slow", 
     "প্রভু যীশু আমার পরিত্রাতা, তুমি আমার জীবন...", 
     "[Verse 1]\nG           D\nপ্রভু যীশু আমার পরিত্রাতা\nEm          C\nতুমি আমার জীবন\nG           D\nতোমার প্রেমে আমি বাঁচি\nEm      C       G\nতুমি আমার সবকিছু\n\n[Chorus]\nC           G\nআমি তোমাকে ভালোবাসি\nD           Em\nতুমি আমার প্রাণ\nC           G\nতোমার নামে আমি জয়ী\nD           G\nযীশু আমার ত্রাণ",
     "G, D, Em, C", "GPBC Worship Team", new Date().toLocaleString()],
    
    [2, "Amazing Grace", "english", "worship", "G", "Slow",
     "Amazing grace, how sweet the sound...",
     "[Verse 1]\nG           G7        C\nAmazing grace, how sweet the sound\nG              D\nThat saved a wretch like me\nG           G7      C\nI once was lost, but now I'm found\nG       D       G\nWas blind but now I see\n\n[Verse 2]\nG              G7         C\n'Twas grace that taught my heart to fear\nG              D\nAnd grace my fears relieved\nG           G7        C\nHow precious did that grace appear\nG       D       G\nThe hour I first believed",
     "G, G7, C, D", "GPBC Worship Team", new Date().toLocaleString()],
    
    [3, "তুমি মহান (Tumi Mahan - You Are Great)", "bilingual", "praise", "D", "Medium",
     "তুমি মহান, You are great, O Lord...",
     "[Verse 1]\nD           A\nতুমি মহান, তুমি মহান\nBm          G\nYou are great, O Lord\nD           A\nআমার ঈশ্বর, আমার রাজা\nBm      G       D\nMy God and my King\n\n[Chorus]\nG           D\nHallelujah, Hallelujah\nA           Bm\nতোমার মহিমা গাই\nG           D\nYou are worthy, You are holy\nA           D\nForever I will praise",
     "D, A, Bm, G", "GPBC Worship Team", new Date().toLocaleString()],
    
    [4, "How Great Thou Art", "english", "worship", "C", "Slow",
     "O Lord my God, when I in awesome wonder...",
     "[Verse 1]\nC                      F        C\nO Lord my God, when I in awesome wonder\n                         G\nConsider all the worlds Thy hands have made\nC                    F           C\nI see the stars, I hear the rolling thunder\n                  G              C\nThy power throughout the universe displayed\n\n[Chorus]\nC                  F           C\nThen sings my soul, my Savior God to Thee\n              Am         G\nHow great Thou art, how great Thou art\nC                  F           C\nThen sings my soul, my Savior God to Thee\n              G              C\nHow great Thou art, how great Thou art",
     "C, F, G, Am", "GPBC Worship Team", new Date().toLocaleString()],
    
    [5, "আনন্দময় দিন (Anandomoy Din - Joyful Day)", "bangla", "christmas", "G", "Fast",
     "আনন্দময় দিন আজ, যীশু এলেন পৃথিবীতে...",
     "[Verse 1]\nG           D\nআনন্দময় দিন আজ\nEm          C\nযীশু এলেন পৃথিবীতে\nG           D\nত্রাণকর্তা এসেছেন\nEm      C       G\nআমাদের বাঁচাতে\n\n[Chorus]\nC           G\nগ্লোরিয়া, গ্লোরিয়া\nD           Em\nস্বর্গে শান্তি এলো\nC           G\nহালেলুইয়া গাই\nD           G\nপ্রভু জন্ম নিলো",
     "G, D, Em, C", "GPBC Worship Team", new Date().toLocaleString()]
  ];
  
  samples.forEach(song => sheet.appendRow(song));
}

function addTestimony(ss, data) {
  let testimonySheet = ss.getSheetByName('Testimonies');
  if (!testimonySheet) {
    testimonySheet = ss.insertSheet('Testimonies');
    testimonySheet.appendRow([
      'ID',
      'Name',
      'Member Since',
      'Testimony',
      'Language',
      'Timestamp',
      'Status'
    ]);
    const headerRange = testimonySheet.getRange(1, 1, 1, 7);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#667eea');
    headerRange.setFontColor('white');
  }
  
  const testimony = data.testimony;
  const lastRow = testimonySheet.getLastRow();
  const newId = lastRow > 1 ? testimonySheet.getRange(lastRow, 1).getValue() + 1 : 1;
  
  testimonySheet.appendRow([
    newId,
    testimony.name,
    testimony.memberSince || 'Recent member',
    testimony.text,
    testimony.language,
    new Date().toLocaleString(),
    'Pending Review'
  ]);
  
  return createJsonResponse({ success: true, message: 'Testimony submitted successfully', id: newId });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
