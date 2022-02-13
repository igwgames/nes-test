# nes-test

A simple [jasmine](https://jasmine.github.io/api/4.0/matchers.html) + 
mesen-based test runner for the NES. Validate that your generated roms have
the proper size/signature, and do the right things when you run them.

**Note**: This is a _very_ early project! If you find this thing useful, _please_ let me know!
If I see people using this I'll be much more likely to carry the project forward.

## Features

* Write unit tests using jasmine and javascript
* Inspect memory locations during game execution
* Use labels and variables defined in assembly/C when debug information is configured
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
    

it('gameState C variable starts at 0, then is updated after you dismiss the menu', async () => {

    // Create a new emulator instance
    emulator = new NesEmulator('./data/working-nrom.nes');
    // Open the emulator
    emulator.start();

    // Check the initial state of gameState
    expect(await emulator.getByteValue('gameState')).toEqual(0)

    // Wait for input to start being accepted, then press start
    await emulator.runCpuFrames(60);
    await emulator.sendInput({start: true});
    await emulator.runCpuFrames(30);

    // Validate gameState was properly updated
    expect(await emulator.getByteValue('gameState')).toEqual(11);

    // Stop the emulator
    emulator.stop();
});

```

There are plenty of examples in the [examples/](examples) folder. These may be a good first stop!

## Installation

Download the binary for your operating system from the github releases page.

https://github.com/cppchriscpp/nes-test/releases

Put this somewhere on your system, then create a folder for your tests. (You can also copy the examples folder from this repo to start!)

Download mesen from https://mesen.ca, and put mesen.exe (**not mesen.zip**) in the same folder you put the nes-test binary.

Run the program by calling it on the command line, with the relative path to your tests.

```sh
./nes-test-win ./examples
```

### Major rewrite version 0.3

0.3 is a complete rewrite of the features of this library. Old code will not work! 
0.3 restructures the library to allow better passing of data to/from the emulator. It also allows much more intuitive
test writing. 


If you need 0.2, here is a link:

[0.2 version](https://github.com/cppchriscpp/nes-test/tree/v0.2.1)


### Special notes for linux

This program will work as expected with linux, however Mesen has a few special requirements to get it going. Namely, you'll need the
following packages, which may be installed using apt or a similar package manager. 

* mono-complete
* libsdl2-2.0
* gnome-themes-standard (You might be able to get away without this one if you only ever use the test runner)

Find more information on running Mesen on linux here: https://github.com/SourMesen/Mesen#ubuntu 

Otherwise follow all of the instructions in the above section. Yes, you really are going to run a .exe file on linux.

## Examples

There are plenty of examples with documentation in the [examples folder](examples/)

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

### NesEmulator

NesEmulator is a class that takes in a rom, and starts up a controlled emulator with the rom. 
It allows many options, including getting ram and ppu values, sending input, and more. 

The one constructor parameter is the path to a rom file, relative to the current script file.

```javascript
const sequence = new NesTestSequence('./roms/rom.nes');
```

#### runCpuFrames(number)

This tells the emulator to wait a set number cpu frames before running any instructions. This can be used to wait for things like title screen
rendering, level updates, etc.

#### sendInput(object, controllerNumber = 0)

This tells the emulator to send the input requested for one frame. (If you need multiple frames, use a 
loop to call this multiple times.)

You should pass an object with `true` or `false` for each button. (Available buttons: `a, b, up, down, left, right, start, select`).

The second parameter is a controller number - it is the first controller (0) by default, but pass 1 for player 2.

Example: `sequence.sendInput({up: true, a: true})`
This will press the up and a button for one frame.

#### getByteValue(name or address)

This fetches the value of a byte from the rom at the given address. The address can be a number, 
and that address will be fetched. 

Example: `emulator.getByte(0x200)`

This would grab the first sprite byte in the rom. 

If your rom has debug symbols in a `.dbg` file generated by a modern version of ca65 or cc65, you can also 
pass a string with a name of a label or variable as the address, and the tool will attempt to look the
address up.

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
expect(await emulator.getByte('myVariable')).toEqual(25);
```

**C**: In your game, you define a variable named `myCVariable`
```c
unsigned char myCVariable;
// Later, in some function
myCVariable = 25;
```
In your test, you can do this:
```javascript
expect(await emulator.getByte('myCVariable')).toEqual(25);
```

#### getWordValue(address)
#### getPpuByteValue(address)
#### getPpuWordValue(address)

See the section for `getRomByte` above. These work the same way, but return different data.

#### getByteRange(address, length)

This works the same as `getRomByte`, but instead fetches an entire range of values in sequence. 

This will return a javascript array you can iterate over, or otherwise test.

#### takeScreenshot(name, [options])

Take a screenshot from the emulator, which can be compared with pre-made screenshots of the behavior you expect to see.

To run one of those tests, you can do the following, where your screenshot is a file on disk. The path to your screenshot
will be relative to the directory the test runs in.

```javascript
// Take a screenshot of the intro screen
const testImage = await emulator.takeScreenshot('intro-screen.png');

// Do a comparison that they're similar (at least 80% the same)
expect(testImage).toBeSimilarToImage('./data/intro-screenshot.png');

// Also test that they're identical. (You'll generally want to do only one of these tests, but both are provided for the example)
expect(testImage).toBeIdenticalToImage('./data/intro-screenshot.png');
```

There is one option available: `copyToLocation` - if you provide a path here, the screenshot will be copied to the location 
you specify, instead of being deleted at the end of the rest run.

##### Matcher expect(pathToScreenshot).toBeSimilarToImage(pathToScreenshot)

This can be used to tell whether an image is simlar to another image. It will be successful if at least 80% of the pixels in the 
two provided images match.

The left image should be your test image - you need the full path, which can be gotten from `emulator.getScreenshotPath('name')`,
or as the return value from the `takeScreenshot` method.

The right image should be a relative path to an image you have pre-created to compare with. 

##### Matcher expect(pathToScreenshot).toBeIdenticalyToImage(pathToScreenshot)

This is functionally identical to the matcher above, however it requires a 100% match.

Note that this will fail if you have input displays turned on for your Mesen instance. 

##### Caveats

Due to limitations with Mesen, any input display that you have enabled in Mesen will show up in your screenshots.

The easiest way to deal with this is to use the `toBeSimilarToImage` matcher, which will compensate for issues like
this. You can also turn the feature off from Mesen's ui, if you would like. Unfortunately Mesen gives us no way to
disable this feature for test runs at the moment.

## Configuration

There is not much configuration for this module yet, but a few environment variables can customize behavior to help your debugging: 

* `MESEN_EXE` - set this to the path to your mesen exe. By default, this will look in your current directory.
* `DEBUG_OPEN_MESEN` - Set this to `true` to open mesen and run a test in the script runner. (Note: enable a single test with `fit()` or behavior may be unpredictable!)

## Gotchas with jasmine

Tests in jasmine time out after 5 seconds by default. If you need longer, you can set the `DEFAULT_TIMEOUT_INTERVAL` environment variable when running
the tool. (Values are in milliseconds)

## Potential future features

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
