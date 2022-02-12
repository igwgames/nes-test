const NesEmulator = require('nes-test').NesEmulator;

describe('data range example', () => {
    it('Validates that rom values are all 0', async () => {
        const emulator = new NesEmulator('./data/working-nrom.nes');

        await emulator.start();

        // This range is unused in the example rom
        const range = await emulator.getByteRange(0x600, 256);
        expect(range.length).toEqual(256);
        for (let i = 0; i < range.length; i++) {
            expect(range[i]).toEqual(0);
        }


        await emulator.stop();

    });
});