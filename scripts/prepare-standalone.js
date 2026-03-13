const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function prepare() {
    const root = path.join(__dirname, '..');
    const standaloneDir = path.join(root, '.next', 'standalone');
    const zipPath = path.join(root, 'standalone.zip');

    console.log(`Zipping standalone from ${standaloneDir} to ${zipPath}`);

    if (!fs.existsSync(standaloneDir)) {
        console.error('Error: .next/standalone not found. Run next build first.');
        process.exit(1);
    }

    if (fs.existsSync(zipPath)) {
        console.log('Removing old standalone.zip...');
        fs.unlinkSync(zipPath);
    }

    try {
        console.log('Creating standalone.zip using PowerShell...');
        // Use PowerShell to create the zip for wide compatibility on Windows
        // We zip the contents of .next/standalone
        const command = `powershell -Command "Compress-Archive -Path '${standaloneDir}\\*' -DestinationPath '${zipPath}' -Force"`;
        execSync(command, { stdio: 'inherit' });
        console.log('standalone.zip created successfully.');
    } catch (e) {
        console.error('Error creating standalone.zip:', e);
        process.exit(1);
    }
}

prepare();
