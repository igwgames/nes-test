# nes-test

A simple jasmine + mesen-based test runner for the NES. Validate that your generated roms have
the proper size/signature, and do the right things when you run them.

**Note**: This is a _very_ early project! If you find this thing useful, _please_ let me know!
If I see people using this I'll be much more likely to carry the project forward.

## Features

* Write unit tests using jasmine and javascript
* Inspect memory locations during game execution
* Inspect rom file for correctness (header is present, rom length matches header)
* cross-platform support (windows + linux. Mac os if you can get mesen running!))
* Distributed as a single binary, or an npm module


## Example test

More examples can be found in the `examples/` folder! 

```javascript

it('Validates that this is a valid NES rom', async () => {
    // Rom paths are relative to the test script
    romData = new NesRomFile('./data/working-nrom.nes');
    expect(romData.hasValidHeader()).toEqual(true);
});

it('Successfully boots and sets gameState to title input state (11)', async () => {

    // Test the initial value
    testSequence.assertEqual('gameState does not start as 0', testSequence.getRamByteFromC('gameState'), 0);
    // NOTE: We could also test testSequence.getRamByteFromAssembly('_gameState'), for games written in assembly language.

    // Wait for the intro screen to be dismissable
    testSequence.runCpuFrames(60);

    // Dismiss the intro screen
    testSequence.sendInput({start: true});
    // Wait for updates to happen

    testSequence.runCpuFrames(30);
    
    // Check hat gameState has been updated.
    testSequence.assertEqual('gameState not set to input state', testSequence.getRamByteFromC('gameState'), 11);

    await testSequence.run();
});

```

## Installation

Download the binary for your operating system from the github releases page.

https://github.com/cppchriscpp/nes-test/releases

Put this somewhere on your system, then create a folder for your tests. (You can also copy the examples folder from this repo to start!)

Download mesen from https://mesen.ca, and put mesen.exe (**not mesen.zip**) in the same folder you put the nes-test binary.

Run the program by calling it on the command line, with the relative path to your tests.

```sh
./nes-test-win ./examples
```

### Special notes for linux

This program will work as expected with linux, however Mesen has a few special requirements to get it going. Namely, you'll need the
following packages, which may be installed using apt or a similar package manager. 

* mono-complete
* libsdl2-2.0
* gnome-themes-standard (You might be able to get away without this one if you only ever use the test runner)

Find more information on running Mesen on linux here: https://github.com/SourMesen/Mesen#ubuntu 

Otherwise follow all of the instructions in the above section. Yes, you really are going to run a .exe file on linux.

## Documentation

I really need to write proper documentation. For now, here's a barebones version.

### NesRom

The NesRom tool allows you to inspect the contents of a rom file. The constructor requires the path to a rom, relative to the current
test file.

```javascript
const rom = new NesRom('./roms/rom.nes');
```

The methods listed in this section can be called on it.

#### hasValidHeader() 

Will return `true` if the header is valid, and the rom size matches what is expected from the number of prg and chr banks specified in 
the header.

#### getMapper()

Returns the mapper number specified in the header.

#### getMirroring()

Returns the mirroring set in the header, either the string `'horizontal'` or '`vertical'`.

#### getIncludesBatteryBackedRam()

Returns true if the flag for battery backed ram is set in the header, or false if it is not.

#### getIncludesFourScreenVram()

Returns true if the flag for 4 screen vram is set in the header, or false if it is not.

#### raw

The `raw` parameter on the rom contains a UInt8Array of the bytes in the rom, for your inspection.

#### symbols

If there is a `.dbg` file with the same name as the rom in the same folder, this will have a list of 
all recognized assembly and c symbols parsed from the debug file, mapped to memory addresses. 
If you have debugging in mesen working, this work with the same file. 

It has two sub-objects: `assembly` and `c`. (The C one will only be populated if you created a game with C debugging
symbols.)

This is used within NesTestSequence to test ram values at these locations.

### NesTestSequence

NesTestSequence is a class that collects a set of instructions for your emulator to run. These can include sending input,
and looking at memory addresses to see what values are set. You must create all of the instructions you want to run, then
call `.run()` to execute the commands. Any assertions that fail will throw an exception - which will fail tests in jasmine
and tell you which assertion failed. (You can use try/catch to override this)

The one constructor parameter is the path to a rom file, relative to the current script file.

```javascript
const sequence = new NesTestSequence('./roms/rom.nes');
```

#### runCpuFrames(number)

This tells the emulator to wait a set number cpu frames before running any instructions. This can be used to wait for things like title screen
rendering, level updates, etc.

#### sendInput(object, controllerNumber = 0)

This tells the emulator to send the input requested for one frame. (If you need multiple frames, use `runCpuFrames(1)` between each input.)

You should pass an object with `true` or `false` for each button. (Available buttons: `a, b, up, down, left, right, start, select`).

The second parameter is a controller number - it is the first controller (0) by default, but pass 1 for player 2.

Example: `sequence.sendInput({up: true, a: true})`
This will press the up and a button for one frame.

#### assertEqual(name, firstValue, secondValue)

This runs a comparison on the emulator, and throws an error back to the test runner if the comparison does not return true.

Both values can be either a numerical value, or a memory location wrapped by one of the following functions: 
- `sequence.getRamByte(addr)` - anything in cpu memory, 0x0000 to - 0xffff - Usually between 0x0000 and 0x799, and work ram around 0x6000
- `sequence.getPpuByte(addr)` - Anything in ppu memory

Example: `sequence.assertEqual("My first test", sequence.getRamByte(0x01), 25)`
This will pass if the second variable in zeropage is set to 25, or fail otherwise with a message of "My first test"

If your rom has debug symbols in a `.dbg` file generated by a modern version of ca65 or cc65, you have the following
additional functions, available, which will allow you to test values based on symbols created in asssembly or C.
- `sequence.getRamByteFromAssembly(name)`
- `sequence.getRamByteFromC(name)`

Examples: 

**Assembly**: In your game, you define a variable named `myVariable`
```asm
myVariable: .res 1
; ...
lda #25
sta myVariable
```
In your test you can do this: 
```javascript
sequence.assertEqual("My first test", sequence.getRamByteFromAssembly('myVariable'), 25);
```

**C**: In your game, you define a variable named `myCVariable`
```c
unsigned char myCVariable;
// Later, in some function
myCVariable = 25;
```
In your test, you can do this:
```javascript
sequence.assertEqual("My second test", sequence.getRamByteFromC('myCVariable'), 25);
```

#### assertNotEqual(name, firstValue, secondValue)
#### assertLessThan(name, firstValue, secondValue)
#### assertLessThanOrEqualTo(name, firstValue, secondValue)
#### assertGreaterThan(name, firstValue, secondValue)
#### assertGreaterThanOrEqualTo(name, firstValue, secondValue)

See the section for `assertEqual` above. These work the same way.

## Configuration

There is not much configuration for this module yet, but a few environment variables can customize behavior to help your debugging: 

* `MESEN_EXE` - set this to the path to your mesen exe. By default, this will look in your current directory.
* `DEBUG_OPEN_MESEN` - Set this to `true` to open mesen and run a test in the script runner. (Note: enable a single test with `fit()` or behavior may be unpredictable!)

## Gotchas with jasmine

Tests in jasmine time out after 5 seconds by default. If you need longer, you can set the `DEFAULT_TIMEOUT_INTERVAL` environment variable when running
the tool. (Values are in milliseconds)

## Potential future features

* Support testing non-byte values (eg words)
* More methods on NesRom to analyze header information. (mirroring, etc)
* Allow capturing screenshots using the emulator
* Allow image comparison with screenshots 
* Allow installs as a node module. (Note: this might work now, if you're adventurous feel free to try!)
* Explore testing around more advanced mappers.
* Automatically download mesen with confirmation or a command.
* Figure out what is needed for mac compatibility. (How can we run mesen there?)
* Better test roms, with source
* Instructions for running this in continuous integration environments
  * The short version is, I probably need to publish to npm, then have users run `npx nes-test` 
  * For now you could download the binary directly and run it as usual

## Contact

This project is run [cppchriscpp](https://twitter.com/cppchriscpp) - feel free to [email me](mailto:chris@cpprograms.net) or 
send me Twitter messages about this. Alternatively, find me on the VideoGameSage discord in the brewery. 

I want to hear from you! Also if you'd like to contribute, submit an issue or a PR! I don't have many contribution guidelines (yet!) 
but if you've got something you want to see, I'm all ears. 
