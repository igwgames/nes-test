const NesRomFile = require('nes-test').NesRomFile;

let romData;


describe('Rom integrity test', () => {
    
    describe('Rom file data', () => {

        beforeEach(() => {
            romData = new NesRomFile('./data/working-nrom.nes');
        })

        it('Has a valid 16 byte header', async () => {
            expect(romData.hasValidHeader()).toEqual(true);
        });

        it('Is marked as using nrom mapper', async () => {
            expect(romData.getMapper()).toEqual(0);
        });

        it('Has expected data in prg space', async () => {
            // The word "PATCH" is written at 0x10 - compare it letter by letter.
            const word = 'PATCH';
            for (let i = 0; i < word.length; i++) {
                expect(romData.raw[0x10 + i]).toEqual(word.charCodeAt(i));
            }
        });
    });
});