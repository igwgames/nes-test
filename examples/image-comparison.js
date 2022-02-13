const NesEmulator = require('nes-test').NesEmulator;

describe('data range example', () => {
    it('Validates that rom values are all 0', async () => {
        const emulator = new NesEmulator('./data/working-nrom.nes');

        await emulator.start();
        
        // wait a few frames for image to fade in
        await emulator.runCpuFrames(20);

        // Take a screenshot of the intro screen
        const testImage = await emulator.takeScreenshot('intro-screen.png');

        // Do a comparison that they're similar (at least 80% the same)
        expect(testImage).toBeSimilarToImage('./data/intro-screenshot.png');

        // Also test that they're identical. (You'll generally want to do only one of these tests, but both are provided for the example)
        expect(testImage).toBeIdenticalToImage('./data/intro-screenshot.png');

        // Don't forget to exit the emulator!
        await emulator.stop();

    });
});