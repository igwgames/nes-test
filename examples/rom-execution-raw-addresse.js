const NesEmulator = require('nes-test').NesEmulator;

describe('Read direct address', () => {
    it('Successfully boots and sets the value at 0x2fe to 23', async () => {
        const emulator = new NesEmulator('./data/working-nrom.nes');

        await emulator.start();

        await emulator.runCpuFrames(60);
        expect(await emulator.getByteValue(0x2fe)).toEqual(0);

        await emulator.sendInput({start: true});
        await emulator.runCpuFrames(30);
        await emulator.sendInput({start: true});
        await emulator.runCpuFrames(5);

        expect(await emulator.getByteValue(0x2fe)).toEqual(23);

        await emulator.stop();
    })
});