import fs from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const target = new URL('worship-studio/vendor/', root);
const sharedTarget = new URL('assets/presentation/vendor/', root);
await fs.mkdir(target, { recursive: true });
await fs.mkdir(sharedTarget, { recursive: true });
const bundles = [
    ['pptxgenjs/dist/pptxgen.bundle.js', 'pptxgen.bundle.js', 'pptxgenjs/LICENSE'],
    ['html-to-image/dist/html-to-image.js', 'html-to-image.js', 'html-to-image/LICENSE'],
    ['jspdf/dist/jspdf.umd.min.js', 'jspdf.umd.min.js', 'jspdf/LICENSE'],
    ['jszip/dist/jszip.min.js', 'jszip.min.js', 'jszip/LICENSE.markdown']
];
for (const [source, filename, license] of bundles) {
    await fs.copyFile(new URL(`node_modules/${source}`, root), new URL(filename, target));
    await fs.copyFile(new URL(`node_modules/${license}`, root), new URL(`${filename}.LICENSE.txt`, target));
    await fs.copyFile(new URL(filename, target), new URL(filename, sharedTarget));
    await fs.copyFile(new URL(`${filename}.LICENSE.txt`, target), new URL(`${filename}.LICENSE.txt`, sharedTarget));
}
console.log('Studio and shared presentation export bundles and licenses synchronized from installed packages.');
