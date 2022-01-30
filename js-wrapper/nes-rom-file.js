const fs = require('fs'),
    path = require('path'),
    getCallingPath = require('../util/get-calling-path');

class NesRomFile {

    romFile = null;
    debugFile = null;

    _romData = [];
    _symbols = null;

    constructor(romFile) {
        this.romFile = path.resolve(getCallingPath(), romFile);

        if (!fs.existsSync(this.romFile)) {
            throw new Error('Rom not found! -- ' + this.romFile);
        }
        this._romData = fs.readFileSync(this.romFile);

        const debugFile = this.romFile.substr(0, this.romFile.lastIndexOf('.')) + '.dbg';
        if (fs.existsSync(debugFile)) {
            this.debugFile = debugFile;
        }
    }

    hasValidHeader() {
        // Check first 4 characters
        if (!(this.raw[0] === 'N'.charCodeAt(0) && this.raw[1] === 'E'.charCodeAt(0) && this.raw[2] === 'S'.charCodeAt(0) && this.raw[3] === 0x1A)) {
            return false;
        }

        const prgLength = this.raw[4];
        const chrLength = this.raw[5];

        if (this.raw.length !== (16/* header*/) + (prgLength * 16384) + (chrLength * 8192)) {
            return false;
        }

        return true;
    }

    getMapper() {
        return (this.raw[6] >> 4) + (this.raw[7] & 0xf0);
    }

    getMirroring() {
        return (this.raw[6] & 0x01) ? 'vertical' : 'horizontal';
    }

    getIncludesBatteryBackedRam() {
        return !!(this.raw[6] & 0x02);
    }

    getIncludesFourScreenVram() {
        return !!(this.raw[6] & 0x08);
    }

    get raw() {
        return this._romData;
    }

    // TODO: Simple test to prove this works
    get symbols() {
        if (this.debugFile !== null) {
            if (this._symbols === null) {
                this._symbols = this._parseSymbols();
            }
            return this._symbols;
        } else {
            return null;
        }
    }

    // Get the symbols out of the .dbg file, assuming it exists.
    _parseSymbols() {
        const usefulLines = fs.readFileSync(this.debugFile).toString().split('\n').filter(l => (l.startsWith('sym') || l.startsWith('csym')));

        let symbolTable = {c: {}, assembly: {}};
        let cSymbols = [];

        usefulLines.forEach(line => {
            // NOTE: We rely on c symbols appearing earlier in the file than regular symbols, so we can look them up!
            if (line.startsWith('csym')) {
                // Skip any lines that don't have a symbol they're linked to. Not much we can do without that.
                if (line.indexOf(',sym=') === -1 ) { return; }
                const nameIdx = line.indexOf(',name="') + 7,
                    nameEnd = line.indexOf('"', nameIdx+1);
                    
                    // Since we're going to look up by name, we can bypass a lot of the funkiness with linking these
                    // and just grab the names. 
                    cSymbols.push(line.substring(nameIdx, nameEnd));
            } else {
                // Skip symbols that don't have a value, we can't ddo anything with them
                if (line.indexOf(',val=') === -1) { return; }
                
                const nameIdx = line.indexOf(',name="') + 7,
                    nameEnd = line.indexOf('"', nameIdx+1),
                    name = line.substring(nameIdx, nameEnd),
                    valIdx = line.indexOf(',val=0x') + 7,
                    valEnd = line.indexOf(',', valIdx),
                    valStr = line.substring(valIdx, valEnd);

                symbolTable.assembly[name] = parseInt(valStr, 16);

                if (cSymbols.indexOf(name.substring(1)) !== -1) {
                    symbolTable.c[name.substring(1)] = parseInt(valStr, 16);
                }
            }
        });

        return symbolTable;
    }
}

module.exports = NesRomFile;