const fs = require('fs'),
    path = require('path'),
    getCallingPath = require('../util/get-calling-path');

/**
 * Used to represent a NES rom. 
 * Contains a bunch of methods to analyze the static content in the rom.
 */
class NesRomFile {

    romFile = null;
    debugFile = null;

    _romData = [];
    _symbols = null;

    /**
     * Creates a NesRomFile instance.
     * @param {String} romFile The path to the rom, relative to the current test file.
     */
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

    /**
     * Test the rom's header, to make sure it is valid and makes sense for the rest of the rom contents.
     * @returns {Boolean} True if the rom has a valid header, and contents that match the header. Otherwise false.
     */
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

    /**
     * Get the mapper number
     * @returns {Number} The mapper number specified in the header.
     * @see {@link https://wiki.nesdev.org/w/index.php?title=Mapper|NESDev Mapper Reference}
     */
    getMapper() {
        return (this.raw[6] >> 4) + (this.raw[7] & 0xf0);
    }

    /**
     * Gets the mirroring value from the rom header.
     * @returns {String} A string value of either "vertical" or "horizontal".
     */
    getMirroring() {
        return (this.raw[6] & 0x01) ? 'vertical' : 'horizontal';
    }

    /**
     * Check if the rom includes battery-backed ram.
     * @returns {Boolean} True if the header indicates using battery backed ram, otherwise false.
     */
    getIncludesBatteryBackedRam() {
        return !!(this.raw[6] & 0x02);
    }

    /**
     * Test if the rom includes 4 screen vram.
     * @returns {Boolean} True if the header indicates supporting 4 screen vram, false otherwise.
     */
    getIncludesFourScreenVram() {
        return !!(this.raw[6] & 0x08);
    }

    /**
     * Array containing the raw data from the rom, for your own inspection.
     */
    get raw() {
        return this._romData;
    }

    /**
     * If there is a `.dbg` file with the same name as the rom in the same folder, this will have a list of 
     * all recognized assembly and c symbols parsed from the debug file, mapped to memory addresses. 
     * If you have debugging in mesen working, this work with the same file. 
     *
     * It has two sub-objects: `assembly` and `c`. (The C one will only be populated if you created a game with C debugging
     * symbols.)

     * This is used within NesEmulator to test ram values at these locations.     
    */
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