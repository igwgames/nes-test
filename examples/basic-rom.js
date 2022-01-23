const NesTestSequence = require('nes-test').NesTestSequence;
const NesTest = require('nes-test').NesTest;

describe('Basic rom functionality', () => {
    it('Successfully boots and sets the value at 0x2fe to 23', async () => {

        const testSequence = new NesTestSequence('./data/working-nrom.nes');

        // Wait for intro screen to be dismissed
        testSequence.runCpuFrames(60);
        testSequence.assertEqual('Initial memory value not set to 0', NesTestSequence.getRamValue(0x2fe), 0);
        testSequence.sendInput({start: true});
        testSequence.runCpuFrames(30);
        testSequence.sendInput({start: true});
        testSequence.runCpuFrames(5);
        testSequence.assertEqual('Memory value not set as expected', NesTestSequence.getRamValue(0x2fe), 23);

        await testSequence.run();
    });
});