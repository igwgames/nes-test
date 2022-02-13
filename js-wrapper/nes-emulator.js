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

/**
 * Controls a NES emulator, allowing you to run it frame-by-frame, and 
 * get values out of it. 
 */
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

    /**
     * Create a NesEmulator instance, read to be started and run your tests.
     * @param {String} romFile The path to a rom file, relative to the working directory nes-test is called from.
     * @throws {Error} Error if the rom file cannot be found.
     */
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

    /**
     * Run the given lua code, and return any values you set with writeValue. Note that this is an internal method, and shouldn't be needed for most tests!
     * @param {string} string The lua code to run. This can be spread across multiple lines.
     * @returns {object} An object containing some internal state used by the tool. Any 
     * values you set with writeValue() will be available.
     */
    async runLua(string) {
        if (!this.started) {
            throw new Error('Emulator not running!');
        }
        
        // Format that the main lua code we use knows how to parse and execute. 
        // currentEventNumber is passed between this and the lua to make sure events happen in the right order.
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

        // Wait for the emulator/client lua to update js-status.json with the updated state. 
        // Try up to the limit of retries, waiting 50ms between each attempt.
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

    /**
     * Run a set number of frames in the emulator before handling further input.
     * @param {Number} value How many frames to execute
     */
    async runCpuFrames(value) {
        await this.runLua(`waitFrames(${value})`);
    }

    /**
     * Press down one or more buttons for the next frame.
     * @param {object} value An object with keys for any button on the keyboard. Available keys: 
     * - a
     * - b
     * - up
     * - down
     * - left
     * - right
     * - start
     * - select
     * @param {number} controller Which controller to use. (Default player 1)
     * - 0 (player 1) 
     * - 1 (player 2)
     */
    async sendInput(value, controller=0) {
        await this.runLua(`emu.setInput(${controller}, ${this.getLuaFormat(value)})`);
    }

    async takeScreenshot(filename, options = {keepScreenshot: false}) {
        // FIXME: Write this
    }

    /**
     * Given a string key, this will look up the label/variable mapped to the name and return that numeric value. Numeric values will 
     * be returned as-is. Everything else will return null.
     * @param {Number|String} address Either a numeric address or a string representing an address.
     * @throws {Error} An error if a string address is not found in the game's debug file. (Or the file is not present)
     * @returns {Number} A numeric address somewhere in the rom.
     */
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

    /**
     * Get the value of a byte from within the NES memory.
     * @param {Number|String} address Either a numeric address, or a string representing a C or assembly variable
     * @returns {Number} The requested byte.
     */
    async getByteValue(address) {
        let numAddress = this.getNumericAddress(address);
        const state = await this.runLua(`writeValue('thisByte', emu.read(${numAddress}, emu.memType.cpuDebug))`);
        return state.thisByte;
    }
    /**
     * Sets a _memory_ address on the NES to the given value. Note this will have no effect on hardcoded memory addresses.
     * @param {Number|String} address Either a numeric address, or a string representing a C or assembly variable
     * @param {Number} value The value to set the given byte to
     */
    async setMemoryByteValue(address, value) {
        let numAddress = this.getNumericAddress(address);
        await this.runLua(`emu.write(${numAddress}, ${value}, emu.memType.cpuDebug)`);
    }

    /**
     * Set a _data_ address on the NES to the given value. This will have no effect on variable memory addresses, only 
     * on hardcoded PRG data.
     * @param {Number|String} address Either a numeric address, or a string representing a C or assembly variable
     * @param {Number} value The value to set the given byte to
     */
    async setPrgByteValue(address, value) {
        let numAddress = this.getNumericAddress(address);
        await this.runLua(`emu.write(${numAddress}, ${value}, emu.memType.prgRom)`);
    }

    /**
     * Set a byte in ppu memory to a given value.
     * @param {Number|String} address Either a numeric address, or a string representing a C or assembly variable
     * @param {Number} value The value to set the given byte to.
     */
    async setPpuByteValue(address, value) {
        let numAddress = this.getNumericAddress(address);
        await this.runLua(`emu.write(${numAddress}, ${value}, emu.memType.ppuDebug)`);
    }

    /**
     * Get the value of a bytefrom within the PPU memory.
     * @param {Number|String} address Either a numeric address, or a string representing a C or assembly variable
     * @returns {Number} The requested byte.
     */
    async getPpuByteValue(address) {
        let numAddress = this.getNumericAddress(address);
        const state = await this.runLua(`writeValue('thisByte', emu.read(${numAddress}, emu.memType.ppuDebug))`);
        return state.thisByte;
    }

    /**
     * Get the value of a word (two consecutive bytes) from within the NES memory.
     * @param {Number|String} address Either a numeric address, or a string representing a C or assembly variable
     * @returns {Number} The requested word.
     */
    async getWordValue(address) {
        let numAddress = this.getNumericAddress(address);
        const state = await this.runLua(`writeValue('thisWord', emu.readWord(${numAddress}, emu.memType.cpuDebug))`);
        return state.thisWord;
    }
    /**
     * Get the value of a word (two consecutive bytes) from within the PPU memory.
     * @param {Number|String} address Either a numeric address, or a string representing a C or assembly variable
     * @returns {Number} The requested word.
     */
    async getPpuWordValue(address) {
        let numAddress = this.getNumericAddress(address);
        const state = await this.runLua(`writeValue('thisWord', emu.readWord(${numAddress}, emu.memType.ppuDebug))`);
        return state.thisWord;
    }

    /**
     * Sets a _memory_ address on the NES to the given value. Note this will have no effect on hardcoded memory addresses.
     * @param {Number|String} address Either a numeric address, or a string representing a C or assembly variable
     * @param {Number} value The value to set the given word to
     */
     async setMemoryWordValue(address, value) {
        let numAddress = this.getNumericAddress(address);
        await this.runLua(`emu.write(${numAddress}, ${value}, emu.memType.cpuDebug)`);
    }

    /**
     * Set a _data_ address on the NES to the given value. This will have no effect on variable memory addresses, only 
     * on hardcoded PRG data.
     * @param {Number|String} address Either a numeric address, or a string representing a C or assembly variable
     * @param {Number} value The value to set the given word to
     */
    async setPrgWordValue(address, value) {
        let numAddress = this.getNumericAddress(address);
        await this.runLua(`emu.writeWord(${numAddress}, ${value}, emu.memType.prgRom)`);
    }

    /**
     * Set a word in ppu memory to a given value.
     * @param {Number|String} address Either a numeric address, or a string representing a C or assembly variable
     * @param {Number} value The value to set the given word to.
     */
    async setPpuWordValue(address, value) {
        let numAddress = this.getNumericAddress(address);
        await this.runLua(`emu.writeWord(${numAddress}, ${value}, emu.memType.ppuDebug)`);
    }


    /**
     * Get a sequence of bytes from the game's memory, of the length requested.
     * @param {Number|String} address Either a numeric address, or a string representing a C or assembly variable.
     * @param {Number} length How many bytes to include in the sequence.
     * @returns {Number[]} An array with the requested bytes.
     */
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
    
    /**
     * Generates lua format from a simple json object
     * @param {@} value A json object
     * @returns A tring with the lua of that object
     * @ignore
     */
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


    /**
     * Start the emulator, so that commands can be run.
     */
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

    /**
     * Stop the emulator and clean up all temporary test data.
     * @param {number} code Optional error code to return from Mesen when it exits. You probbably don't want to set this.
     */
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