const fs = require('fs'),
    path = require('path'),
    os = require('os'),
    StreamZip = require('node-stream-zip'),
    axios = require('axios'),
    childProcess = require('child_process');

const MESEN_ZIP = 'https://github.com/SourMesen/Mesen/releases/download/0.9.9/Mesen.0.9.9.zip',
    MESEN_FILE = 'Mesen.0.9.9.zip';

function getAppData() {
    switch (os.platform()) {
        case 'win32':
        case 'win64': // Probably not real but just in case
            return path.join(os.homedir(), 'AppData', 'Roaming');
        case 'darwin':
            return path.join(os.homedir(), 'Library', 'Application Support');
        case 'linux':
        default:
            return path.join(os.homedir(), '.config');
    }
}


async function downloadFile(url, dest) {
    const res = await axios({method: 'get', url, responseType: 'stream'});
    const writer = fs.createWriteStream(dest);

    await new Promise((resolve, reject) => {
        res.data.pipe(writer);

        let error = null;
        writer.on('error', err => {
            writer.close();
            reject(err);
            error = err;
        });

        writer.on('close', () => {
            if (!error) {
                resolve();
            }
        });
    });
}

function testForMono() {
    // Print out a message if mono isn't present on the OS. 
    const res = childProcess.spawnSync('/usr/bin/which', ['mono']);

    if (res.status !== 0) {
        console.warn('\x1b[33m[nes-test] WARNING: mono executable not available on path! If you get errors, you may need to install it.\x1b[0m')
        console.warn('On Ubuntu or Debian, you can install Mesen dependencies using apt:');
        console.warn(' > sudo apt-get install mono-complete libsdl2-2.0 gnome-themes-standard');
    }
}

async function ensureMesenAvailable() {
    const ourAppData = path.join(getAppData(), 'nes-test');
    if (!fs.existsSync(path.join(ourAppData, 'Mesen.exe'))) {
        console.info('[nes-test] Mesen.exe not found, Downloading and configuring...');
        try { 
            fs.mkdirSync(ourAppData);
        } catch (e) {
            if (e.code !== 'EEXIST') {
                console.error('[nes-test] Unable to create application data folder for mesen, cannot run emulator tests!');
                console.error('[nes-test] Underlying error:', e);
            }
        }
        try {
            await downloadFile(MESEN_ZIP, path.join(ourAppData, MESEN_FILE));
            const zip = new StreamZip.async({file: path.join(ourAppData, MESEN_FILE)});
            await zip.extract(null, path.join(ourAppData));
            await zip.close();
        } catch (e) {
            console.error('[nes-test] Unable to download/extract Mesen - emulator tests will not work!');
            console.error('[nes-test] Underlying error:', e);
        }

        // Non-windows platforms need some binary tweakin to allow execution.
        if (process.platform !== 'win32') {
            fs.chmodSync(path.join(ourAppData, 'Mesen.exe'), 0o755);
            testForMono();
        }

        // Finally, copy our configuration file to the same folder, to make it run in portable mode
        // For pkg compatibility we have to readFileSync then writeFileSync. They don't yet support copyFileSync
        const cfg = fs.readFileSync(path.join(__dirname, 'mesen-settings.xml'));
        fs.writeFileSync(path.join(ourAppData, 'settings.xml'), cfg);

    }
}

function getMesen() {
    return path.join(getAppData(), 'nes-test', 'Mesen.exe');
}

module.exports = {
    ensureMesenAvailable,
    getMesen
}