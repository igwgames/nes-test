const NesTestSequence = require('nes-test').NesTestSequence;

let testSequence;
describe('Rom execution (c)', () => {
    beforeEach(() => {
        // Create a new unique sequence for each test
        testSequence = new NesTestSequence('./data/working-nrom.nes');
    });
    
    it('Successfully boots and sets gameState to title input state (11)', async () => {

        testSequence.assertEqual('gameState does not start as 0', testSequence.getRamByteFromC('gameState'), 0);
        // Wait for the intro screen to be dismissable
        testSequence.runCpuFrames(60);
        
        testSequence.sendInput({start: true});
        // Wait for intro screen to be dismissed
        testSequence.runCpuFrames(30);
        testSequence.assertEqual('gameState not set to input state', testSequence.getRamByteFromC('gameState'), 11);

        await testSequence.run();
    });
});
