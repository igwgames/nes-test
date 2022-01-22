const fs = require('fs'),
    process = require('process'),
    path = require('path'),
    uuid = require('uuid').v4,
    childProcess = require('child_process');

const mesenExe = process.env.MESEN_EXE || path.join(process.cwd(), 'mesen');

class NesTestSequence {

    romFile = null;
    instructionSequence = [];
    // Start with "No error" at index 0, so we can line up failures with 1+ return codes
    assertionNames = ['No Error'];
    rawResult = null;
    currentFrame = 0;
    closed = false;
    testId;
    testFile;
    useTestRunner = !(process.env.DEBUG_OPEN_MESEN === 'true');

    constructor(romFile) {
        this.romFile = path.resolve(process.cwd(), romFile);
        this.testId = uuid();
        this.testFile = path.join(process.cwd(), 'nes-test-temp', `test-` + this.testId + '.lua')

        if (!fs.existsSync(this.romFile)) {
            throw new Error('Rom not found! -- ' + this.romFile);
        }
    }

    runCpuFrames(value) {
        this.currentFrame += value;
    }

    sendInput(value, controller=0) {
        this.instructionSequence.push({frame: this.currentFrame, type: 'sendInput', value, controller});
    }

    // FIXME: assertGreaterThan, lessThan, greaterthanOrEqual, lessthanOrEqual, assertNotEqual
    assertEqual(name, valueA, valueB) {
        this.assertionNames.push(name);
        // Pre-create the error for this, including the stacktrace it would fire if it were to break right here. >:D
        const error = new Error('[nes-test][assertEqual] ' + name);
        this.instructionSequence.push({frame: this.currentFrame, type: 'assert', valueA, valueB, operator: '==', assertIndex: this.assertionNames.length - 1, error});
    }

    getRawResult() {
        return this.rawResult;
    }

    // Convert js objects to lua, inserting emulator function calls if `type` is set as expected.
    // TODO: This is a bit clumsy, and may need breaking up.
    getLuaFormat(value, insertFunctions = false) {
        if (typeof value === 'string') {
            return '"' + value + '"';
        }

        if (typeof value !== 'object') {
            return value;
        }

        if (insertFunctions) {
            if (value.type === 'cpu') {
                return `emu.read(${value.address}, emu.memType.cpuDebug)`;
            } else {
                throw new Error('Unknown NesTest object type passed into formatter: ' + JSON.stringify(value));
            }
        }
        // Generic object, not of our special type.
        const kvLua = Object.keys(value).map((k) => {
            const v = this.getLuaFormat(value[k]);
            return ' ' + k + ' = ' + v;
        });
        return `{ ${kvLua} }`;
    }

    getEventTableLua() {
        return this.instructionSequence.map(event => {
            if (event.type === 'assert') {
                let memA = this.getLuaFormat(event.valueA, true);
                let memB = this.getLuaFormat(event.valueB, true);
                
                const asserter = `function() if (${memA} ${event.operator} ${memB}) then return true else return false end end`;
                return `{  frame = ${event.frame}, type = "${event.type}", index = ${event.assertIndex}, asserter = ${asserter} }`
            } else {
                return this.getLuaFormat(event);
            }
        }).join(',\n    ') + "\n\n";
    }

    // Run the test sequence we've written.
    async run() {
        // TODO: Break out the pieces here at some point. It's not all that pretty.

        // Add the "stop" event to wrap things up
        this.closed = true;
        this.currentFrame += 1;
        this.instructionSequence.push({frame: this.currentFrame, type: 'stop'});

        // Generate the lua file
        try { fs.mkdirSync(path.join(process.cwd(), 'nes-test-temp')) } catch (e) { /* Directory exists, do nothing */ }
        let baseLua = fs.readFileSync(path.join(__dirname, '..', 'lua', 'base.lua')).toString();
        baseLua = baseLua
            .replace('-- [nes-test-replacement events]', this.getEventTableLua())
            .replace('-- [nes-test-replacement stopOnErrors]', 'stopOnErrors = ' + (this.useTestRunner ? 'true' : 'false'));
        fs.writeFileSync(this.testFile, baseLua);

        // Run mesen, get the result code
        const responseCode = await new Promise((resolve, reject) => {
            const emu = childProcess.spawn(mesenExe, [...(this.useTestRunner ? ['--testrunner'] : []), this.romFile, this.testFile]);
            
            // TODO: Slightly better error handling, print the message.
            emu.on('error', error => reject(error));
            emu.on('close', code => resolve(code));
        });

        // TODO: Allow keeping the file if requested
        try { fs.rmSync(this.testFile) } catch (e) { console.error('Failed deleting test file', e); }

        if (responseCode > 0) {
            const failedLine = this.instructionSequence.find(i => i.assertIndex === responseCode);
            if (failedLine !== undefined) {
                throw failedLine.error;
            } else {
                throw new Error('Unknown problem running the tests. Response code: ' + responseCode);
            }
        }

        // Now run mesen with the rom and the lua file. 

        // Parse the result back into language we get, and return the result. (Or throw? 

        this.rawResult = {};
    }

}

module.exports = NesTestSequence;