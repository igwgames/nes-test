const NesTestSequence = require('nes-test').NesTestSequence;

let testSequence;
describe('Rom execution (c)', () => {
    beforeEach(() => {
        // Create a new unique sequence for each test
        testSequence = new NesTestSequence('./data/working-nrom.nes');
    });
    
    it('Clears all sprite memory at startup', async () => {
        // Give a few frames for startup
        testSequence.runCpuFrames(2);

        // Make sure all values in the sprite table are empty
        for (var i = 0; i < 255; i++) {
            testSequence.assertEqual('Sprite mem value ' + i + 'not  cleared', testSequence.getRamByte(0x200 + i), 0);
        }
        await testSequence.run();
    });

});
