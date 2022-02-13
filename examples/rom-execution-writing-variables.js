const NesEmulator = require('nes-test').NesEmulator;

let emulator;
describe('Writing variables', () => {
    beforeEach(async () => {
        // Create a new unique sequence for each test
        emulator = new NesEmulator('./data/working-nrom.nes');
        // And start the emulator
        await emulator.start();

        // Get into main game loop, past two menu screens.
        await emulator.runCpuFrames(60);
        await emulator.sendInput({start: true});
        await emulator.runCpuFrames(60);
        await emulator.sendInput({start: true});
        await emulator.runCpuFrames(60);
    });

    afterEach(async () => {
        // Stop the emulator
        await emulator.stop();
    })
    

    it('gameState #26 resets playerKeyCount variable', async () => {
        // Set the value to something bogus
        await emulator.setMemoryByteValue('playerKeyCount', 45);
        expect(await emulator.getByteValue('playerKeyCount')).toEqual(45);

        // set gameState
        await emulator.setMemoryByteValue('gameState', 20);
        // Run a frame to get into the main game loop
        await emulator.runCpuFrames(1);
        // Test to make sure the value was reset
        expect(await emulator.getByteValue('playerKeyCount')).toEqual(0);
    });

    it('gameState #26 resets playerCrateCount variable', async () => {
        // Set the value to something bogus
        await emulator.setMemoryByteValue('playerCrateCount', 45);

        // set gameState
        await emulator.setMemoryByteValue('gameState', 26);
        // Run a frame to get into the main game loop
        await emulator.runCpuFrames(1);
        // Test to make sure the value was reset
        expect(await emulator.getByteValue('playerCrateCount')).toEqual(0);
    });


});
