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
* Support for both windows and linux! (Mac support will come if mesen is ever officially supported there)
* Distributed as a single binary, or an npm module

## Quick Links

- [Downloads](https://github.com/cppchriscpp/nes-test/releases)
- [API Documentation](https://cppchriscpp.github.io/nes-test/)
- [Example Usage](https://github.com/cppchriscpp/nes-test/tree/main/examples)
- [Linux Notes](#special-notes-for-linux)

## Example test

More examples can be found in [the examples/ folder](https://github.com/cppchriscpp/nes-test/tree/main/examples)! 

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

There are plenty of examples in the [examples/](https://github.com/cppchriscpp/nes-test/tree/main/examples) folder. 


## Installation

Download the binary for your operating system from the github releases page.

https://github.com/cppchriscpp/nes-test/releases

Put this somewhere on your system, then create a folder for your tests. (You can also copy the examples folder from this repo to start!)

Run the program by calling it on the command line, with the relative path to your tests.

```sh
./nes-test-win ./examples
```

### Major rewrite version 0.3

0.3 is a complete rewrite of the features of this library. Old code will not work! 
0.3 restructures the library to allow better passing of data to/from the emulator. It also allows much more intuitive
test writing. It also installs Mesen automatically, so no manual setup is required!


If you need 0.2, here is a link:

[0.2 version](https://github.com/cppchriscpp/nes-test/tree/v0.2.1)


### Special notes for linux

This program will work as expected with linux, however Mesen has a few special requirements to get it going. Namely, you'll need the
following packages, which may be installed using apt or a similar package manager. 

* mono-complete
* libsdl2-2.0
* gnome-themes-standard (You might be able to get away without this one if you only ever use the test runner)

If you run into issues, try downloading a copy of Mesen manually and getting it to work. The tool should inherit any
changes you make to your system.

Find more information on running Mesen on linux here: https://github.com/SourMesen/Mesen#ubuntu 

Otherwise follow all of the instructions in the above section. Mesen will be automatically downloaded in a config directory
when you first run the tests.

## Examples

There are plenty of examples with documentation in the [examples folder](https://github.com/cppchriscpp/nes-test/tree/main/examples)

## Documentation

All API methods are documented on [the github pages site](https://cppchriscpp.github.io/nes-test/)

## Configuration

There is not much configuration for this module yet, but a few environment variables can customize behavior to help your debugging: 

* `DEBUG_OPEN_MESEN` - Set this to `true` to open mesen and run a test in the script runner. (Note: enable a single test with `fit()` or behavior may be unpredictable!)

## Gotchas with jasmine

* Tests in jasmine time out after 5 seconds by default. If you need longer, you can set the `DEFAULT_TIMEOUT_INTERVAL` environment variable when running the tool. (Values are in milliseconds)
* The `NesEmulator` class methods are almost all asynchronous, so be sure to prefix them with `await`, or you could encounter weird bugs.

## Potential future features

* Allow installs as a node module. (Note: this might work now, if you're adventurous feel free to try!)
* Better test roms, with source
* Instructions for running this in continuous integration environments
  * The short version is, I probably need to publish to npm, then have users run `npx nes-test` 
  * For now you could download the binary directly and run it as usual

## Contact

This project is run [cppchriscpp](https://twitter.com/cppchriscpp) - feel free to [email me](mailto:chris@cpprograms.net) or 
send me Twitter messages about this. Alternatively, find me on the VideoGameSage discord in the brewery. 

I want to hear from you! Also if you'd like to contribute, submit an issue or a PR! I don't have many contribution guidelines (yet!) 
but if you've got something you want to see, I'm all ears. 
