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

    it('Successfully boots and sets the value at 0x2fe to 23', async () => {

        const testSequence = new NesTestSequence('./scratchpad/rom/working.nes');

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

```

## Installation

Download the binary for your operating system from the github releases page.

https://github.com/cppchriscpp/nes-test

Put this somewhere on your system, then create a folder for your tests. (You can also copy the examples folder from this repo to start!)

Download mesen from https://mesen.ca, and put mesen.exe (**not mesen.zip**) in the same folder you put the nes-test binary.

Run the program by calling it on the command line, with the relative path to your tests.

```sh
./nes-test-win ./examples
```

## Configuration

There is not much configuration for this module yet, but a few environment variables can customize behavior to help your debugging: 

* `MESEN_EXE` - set this to the path to your mesen exe. By default, this will look in your current directory.
* `DEBUG_OPEN_MESEN` - Open mesen and run a test in the script runner. (Note: enable a single test with `fit()` or behavior may be unpredictable!)

## Gotchas with jasmine

Tests in jasmine time out after 5 seconds by default. If you need longer, you can set the `DEFAULT_TIMEOUT_INTERVAL` environment variable when running
the tool. (Values are in milliseconds)

## Potential future features

* Use debug ca65 symbol table to map addresses to real value
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