const fs = require('fs'),
    os = require('os'),
    process = require('process'),
    path = require('path'),
    uuid = require('uuid').v4,
    childProcess = require('child_process'),
    NesRomFile  = require('./nes-rom-file'),
    getCallingPath = require('../util/get-calling-path');

const RETRY_LIMIT = 100;

// NOTE: YES, the .exe is needed on all operating systems, since it depends on mono.
const mesenExe = process.env.MESEN_EXE || path.join(process.cwd(), 'Mesen.exe');
const needsMono = process.platform !== 'win32';

const tempDir = path.join(os.tmpdir(), 'nes-test'),
    luaDir = path.join(tempDir, 'lua');

class NesEmulator {

    romFile = null;
    rawResult = null;
    currentFrame = 0;
    started = false;
    testId;
    testFile;
    useTestRunner = !(process.env.DEBUG_OPEN_MESEN === 'true');
    nesRomFileWrapper = null;
    currentEventNumber = 1;
    emulatorHandle = null;
    crashed = false;
    testDirectory;

    constructor(romFile) {
        this.romFile = path.resolve(getCallingPath(), romFile);
        this.testId = uuid();
        this.testDirectory = path.join(luaDir, this.testId);

        if (!fs.existsSync(this.romFile)) {
            throw new Error('Rom not found! -- ' + this.romFile);
        }

        this.nesRomFileWrapper = new NesRomFile(this.romFile);

        // Build the temp directories if they do not exist
        if (!fs.existsSync(this.testDirectory)) {
            try { fs.mkdirSync(path.join(os.tmpdir(), 'nes-test')); } catch (e) { if (e.code !== 'EEXIST') { throw e; } }
            try { fs.mkdirSync(luaDir); } catch (e) { if (e.code !== 'EEXIST') { throw e; } }
            try { fs.mkdirSync(this.testDirectory); } catch (e) { if (e.code !== 'EEXIST') { throw e; } }

        }
        this.testFile = path.join(this.testDirectory, `test-` + this.testId + '.lua')

        // Generate the lua file
        let baseLua = fs.readFileSync(path.join(__dirname, '..', 'lua', 'emulator-controller.lua')).toString();
        baseLua = baseLua.replace('-- [nes-test-replacement interopPath]', 'interopPath = "' + (this.testDirectory + path.sep).replace(/\\/g, '\\\\') + '"');
        fs.writeFileSync(this.testFile, baseLua);
    }

    async runLua(string) {
        if (!this.started) {
            throw new Error('Emulator not running!');
        }
        
        const lua = `
local event = {}

function event.doAction()
    ${string.split('\n').join('\n    ')}
end

function event.getNum()
    return ${this.currentEventNumber}
end

return event`;
        this.currentEventNumber++;

        fs.writeFileSync(path.join(this.testDirectory, 'current-event.lua'), lua);

        let returnState = null;
        for (let i = 0; i < RETRY_LIMIT; i++) {
            try {
                let str = fs.readFileSync(path.join(this.testDirectory, 'js-status.json'));
                let state = JSON.parse(str);
                if (state && state.eventNum === this.currentEventNumber) {
                    returnState = state;
                    break;
                }
            } catch (e) {
                // Do nothing, just try again.
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (returnState === null) {
            throw new Error('Command failed!');
        }
        return returnState;
    }

    async runCpuFrames(value) {
        await this.runLua(`waitFrames(${value})`);
    }

    async sendInput(value, controller=0) {
        await this.runLua(`emu.setInput(${controller}, ${this.getLuaFormat(value)})`);
    }

    async takeScreenshot(filename) {
    }

    getNumericAddress(address) {
        if (typeof address === 'string') {
            if (!this.nesRomFileWrapper.symbols) {
                throw new Error('Debug file not found next to rom file! Cannot look addresses by name.');
            }
            if (typeof this.nesRomFileWrapper.symbols.c[address] !== 'undefined') {
                return this.nesRomFileWrapper.symbols.c[address];
            }
            if (typeof this.nesRomFileWrapper.symbols.assembly[address] !== 'undefined') {
                return this.nesRomFileWrapper.symbols.assembly[address];
            }
            throw new Error('Address name not found in rom: ' + address);
        } else if (typeof address === 'number') {
            return address;
        } else {
            return null;
        }
    }

    async getByteValue(address) {
        let numAddress = this.getNumericAddress(address);
        const state = await this.runLua(`writeValue('thisByte', emu.read(${numAddress}, emu.memType.cpuDebug))`);
        return state.thisByte;
    }

    async getPpuByteValue(address) {
        let numAddress = this.getNumericAddress(address);
        const state = await this.runLua(`writeValue('thisByte', emu.read(${numAddress}, emu.memType.ppuDebug))`);
        return state.thisByte;
    }

    async getWordValue(address) {
        let numAddress = this.getNumericAddress(address);
        const state = await this.runLua(`writeValue('thisWord', emu.readWord(${numAddress}, emu.memType.cpuDebug))`);
        return state.thisWord;
    }

    async getPpuWordValue(address) {
        let numAddress = this.getNumericAddress(address);
        const state = await this.runLua(`writeValue('thisWord', emu.readWord(${numAddress}, emu.memType.ppuDebug))`);
        return state.thisWord;
    }

    async getByteRange(address, length) {
        let numAddress = this.getNumericAddress(address);
        const state = await this.runLua(`
a = {}
for i=1,${length} do
    a[i] = emu.read(${numAddress} + i, emu.memType.cpuDebug)
end
writeValue('range', '"' .. table.concat(a, ",") .. '"')
        `);

        return state.range.split(',').map(i => parseInt(i, 10));
    }
    
    getLuaFormat(value) {
        if (typeof value === 'string') {
            return '"' + value + '"';
        }

        if (typeof value !== 'object') {
            return value;
        }

        // Generic object, not of our special type.
        const kvLua = Object.keys(value).map((k) => {
            const v = this.getLuaFormat(value[k]);
            return ' ' + k + ' = ' + v;
        });
        return `{ ${kvLua} }`;
    }


    // Open the emulator 
    async start() {

        // Add the "stop" event to wrap things up
        this.started = true;
        this.currentEventNumber = 1;
        this.crashed = false;
        // Clean up any event file that might somehow already be in place (Mainly if you're reusing an emulator)
        try { fs.rmSync(path.join(luaDir, 'current-event.lua')) } catch (e) {}


        // Run mesen, get the result code
        this.emulatorHandle = childProcess.spawn(
            needsMono ? 'mono' : mesenExe, 
            [...(needsMono ? [mesenExe] : []), ...(this.useTestRunner ? ['--testrunner'] : []), this.romFile, this.testFile],
            {cwd: tempDir}
        );
        
        this.emulatorHandle.on('error', error => {
            this.started = false;
            this.emulatorHandle = false;
            this.crashed = true;
            console.error('Emulator crashed!', error);
        });
        this.emulatorHandle.on('close', code => {
            this.started = false;
            this.emulatorHandle = false;
            if (code !== 0) {
                this.crashed = true;
                console.warn('Emulator exited with non-zero code');
            }
        });

    }

    async stop(code=0) {
        if (this.started) {
            if (this.useTestRunner) {
                await this.runLua(`emu.stop(${code})`);
                try { fs.rmSync(this.testDirectory, {recursive: true}) } catch (e) { console.error('Failed deleting test data', e); }
            } else {
                await this.runLua('emu.breakExecution()');
            }
        }
    }
}

module.exports = NesEmulator;