const NesTestSequence = require('nes-test').NesTestSequence;
const NesRomFile = require('nes-test').NesRomFile;

let testSequence;
let romData;


describe('Multiple spec test', () => {
    
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

    describe('Rom execution', () => {
        beforeEach(() => {
            // Create a new unique sequence for each test
            testSequence = new NesTestSequence('./data/working-nrom.nes');
        });
        
        it('Clears all sprite memory at startup', async () => {
            // Give a few frames for startup
            testSequence.runCpuFrames(2);

            // Make sure all values in the sprite table are empty
            for (var i = 0; i < 255; i++) {
                testSequence.assertEqual('Sprite mem value ' + i + 'not  cleared', NesTestSequence.getRamValue(0x200 + i), 0);
            }
            await testSequence.run();
        });

        it('Successfully boots and sets the value at 0x2fe to 23', async () => {

            // Wait for the intro screen to be dismissable
            testSequence.runCpuFrames(60);

            // Wait for intro screen to be dismissed
            testSequence.assertEqual('Initial memory value is not set to 0', NesTestSequence.getRamValue(0x2fe), 0);
            testSequence.sendInput({start: true});
            testSequence.runCpuFrames(30);
            testSequence.sendInput({start: true});
            testSequence.runCpuFrames(5);
            testSequence.assertEqual('Memory value not set as expected', NesTestSequence.getRamValue(0x2fe), 23);

            await testSequence.run();
        });
    });
});