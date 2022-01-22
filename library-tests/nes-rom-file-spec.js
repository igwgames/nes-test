const NesRomFile = require('../index.js').NesRomFile;

let nesRomFile

describe('nes-rom-file', () => {

    beforeEach(() => {
        nesRomFile = new NesRomFile('library-tests/data/working-nrom.nes')
    })

    describe('constructor', () => {
        it('Fails if the file does not exist', () => {
            expect(() => new NesRomFile('./pandas-are-kinda-cool-dont-you-think.nes')).toThrow();
        });
        it('Gives a valid rom with a reasonable length when the rom exists', () => {
            // This entire describe/file would fail if rom creation failed, so we can skip that.
            expect(nesRomFile.raw.length).toEqual(40960 + 16);
        });
    });

    // NOTE: We're going to be a bit naughty with this file. The ideal would be to have actual rom files for each file, but that takes space
    // Instead, we're going to use the private interface to the rom data to corrupt it a bit.
    describe('hasValidHeader', () => {
        it('Resolves to false when the file is empty', () =>{
            nesRomFile._romData = [];
            expect(nesRomFile.hasValidHeader()).toEqual(false);
        });
        it('Resolves to false when the NES text is wrong or corrupted', () => {
            nesRomFile._romData[1] = 'A'.charCodeAt(0);
            expect(nesRomFile.hasValidHeader()).toEqual(false);
        });
        it('Resolves to false when the rom length is wrong', () => {
            nesRomFile._romData[4] = 16;
            expect(nesRomFile.hasValidHeader()).toEqual(false);

            // Add a few bytes on the end and let it fail
            const origData = nesRomFile._romData;
            nesRomFile._romData = new Uint8Array(origData.length + 5);
            nesRomFile._romData.set(origData);
            expect(nesRomFile.hasValidHeader()).toEqual(false);
        });
        it('Resolves to true when everything is correct.', () => {
            expect(nesRomFile.hasValidHeader()).toEqual(true);
        });
    });

    describe('getMapper', () => {
        it('serves nrom with our base data', () => {
            expect(nesRomFile.getMapper()).toEqual(0);
        });
        it('recognizes an mmc1 header correctly', () => {
            let header = [0x4E, 0x45, 0x53, 0x1A, 0x08, 0x10, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
            for (i = 0; i < header.length; i++) {
                nesRomFile._romData[i] = header[i];
            }
            expect(nesRomFile.getMapper()).toEqual(1);
        });
        it('recognizes mapper 237 (teletubbies) (why not? it uses both nybbles)', () => {
            let header = [0x4E, 0x45, 0x53, 0x1A, 0x08, 0x10, 0xD2, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
            for (i = 0; i < header.length; i++) {
                nesRomFile._romData[i] = header[i];
            }
            expect(nesRomFile.getMapper()).toEqual(237);
        });
    });
});