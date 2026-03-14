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
        console.log('Copying static and public directories into standalone...');
        const staticDir = path.join(root, '.next', 'static');
        const publicDir = path.join(root, 'public');
        const standStatic = path.join(standaloneDir, '.next', 'static');
        const standPublic = path.join(standaloneDir, 'public');

        if (fs.existsSync(staticDir)) {
            fs.mkdirSync(standStatic, { recursive: true });
            fs.cpSync(staticDir, standStatic, { recursive: true });
        }
        if (fs.existsSync(publicDir)) {
            fs.cpSync(publicDir, standPublic, { recursive: true });
        }

        console.log('Creating standalone.zip using PowerShell...');
        const command = `powershell -Command "Compress-Archive -Path '${standaloneDir}\\*' -DestinationPath '${zipPath}' -Force"`;
        execSync(command, { stdio: 'inherit' });
        console.log('standalone.zip created successfully.');
    } catch (e) {
        console.error('Error creating standalone.zip:', e);
        process.exit(1);
    }
}

prepare();
