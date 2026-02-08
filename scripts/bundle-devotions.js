const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../devotions-data');
const outputFile = path.join(__dirname, '../devotions-db-2026.js');

const months = [
    '01-january.json', '02-february.json', '03-march.json', '04-april.json',
    '05-may.json', '06-june.json', '07-july.json', '08-august.json',
    '09-september.json', '10-october.json', '11-november.json', '12-december.json'
];

let allDevotions = [];

months.forEach(file => {
    const filePath = path.join(dataDir, file);
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const json = JSON.parse(content);
            allDevotions = allDevotions.concat(json);
            console.log(`Loaded ${json.length} devotions from ${file}`);
        } else {
            console.warn(`Warning: File not found ${file}`);
        }
    } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
    }
});

const gratitudeFile = 'gratitude-fasting-devotions.json';
let gratitudeData = null;

try {
    const gPath = path.join(dataDir, '../', gratitudeFile); // It's in the root of project, not devotions-data
    if (fs.existsSync(gPath)) {
        const content = fs.readFileSync(gPath, 'utf8');
        gratitudeData = JSON.parse(content);
        console.log(`Loaded Gratitude Devotions from ${gratitudeFile}`);
    } else {
        console.warn(`Warning: Gratitude file not found at ${gPath}`);
    }
} catch (err) {
    console.error(`Error reading gratitude file: ${err.message}`);
}

const fileContent = `/**
 * BUNDLED DEVOTIONS DATA - Generated for Offline/File Protocol Support
 * Timestamp: ${new Date().toISOString()}
 */
window.DEVOTIONS_2026_DB = ${JSON.stringify(allDevotions, null, 2)};

/**
 * GRATITUDE FASTING DATA
 */
window.GRATITUDE_DEVOTIONS_DB = ${JSON.stringify(gratitudeData, null, 2)};
`;

fs.writeFileSync(outputFile, fileContent);
console.log(`Successfully wrote bundled data to ${outputFile}`);

