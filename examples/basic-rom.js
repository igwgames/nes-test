const NesTestSequence = require('nes-test').NesTestSequence;
const NesTest = require('nes-test').NesTest;

describe('Basic rom functionality', () => {
    it('Successfully boots and sets the value at 0x2fe to 23', async () => {

        const testSequence = new NesTestSequence('./examples/data/working-nrom.nes');

        // Wait for intro screen to be dismissed
        testSequence.runCpuFrames(60);
        testSequence.assertEqual('Initial memory value is set to 0', NesTest.getRamValue(0x2fe), 0);
        testSequence.sendInput({start: true});
        testSequence.runCpuFrames(30);
        testSequence.sendInput({start: true});
        testSequence.runCpuFrames(5);
        testSequence.assertEqual('Memory value not set as expected', NesTest.getRamValue(0x2fe), 23);

        await testSequence.run();
    });
});