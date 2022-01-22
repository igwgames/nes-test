const fs = require('fs'),
    process = require('process'),
    path = require('path');

class NesRomFile {

    romFile = null;
    romData = [];

    constructor(romFile) {
        this.romFile = path.resolve(process.cwd(), romFile);

        if (!fs.existsSync(this.romFile)) {
            throw new Error('Rom not found! -- ' + this.romFile);
        }
        this._romData = fs.readFileSync(this.romFile);
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

    get raw() {
        return this._romData;
    }
}

module.exports = NesRomFile;