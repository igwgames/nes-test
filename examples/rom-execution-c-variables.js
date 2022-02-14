const NesEmulator = require('nes-test').NesEmulator;

let emulator;
describe('Rom execution (C)', () => {
    beforeEach(async () => {
        // Create a new unique sequence for each test
        emulator = new NesEmulator('./data/working-nrom.nes');
        // And start the emulator
        await emulator.start();
    });

    afterEach(async () => {
        // Stop the emulator
        await emulator.stop();
    })
    

    it('gameState C variable starts at 0', async () => {

        expect(await emulator.getByteValue('gameState')).toEqual(0)
    });

    it('gameState C variable is set to 11 after you press start', async () => {
        await emulator.runCpuFrames(60);
        await emulator.sendInput({start: true});
        await emulator.runCpuFrames(30);

        expect(await emulator.getByteValue('gameState')).toEqual(11);
    });
});
