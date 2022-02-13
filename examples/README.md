# Examples

This folder contains a whole bunch of examples of tests you can run with nes-test. You can run them by downloading this folder,
and then running `nes-test` with the path to the folder. For example `nes-test ./examples`

The libraries builds off of a library called [Jasmine](https://jasmine.github.io/) - you may want to familiarize yourself with
this library, particularly if you get stuck.

They use a test rom in the `data` directory. It's a simple one-level puzzle game made with 
[NES Puzzle Maker](https://puzle.nes.science).
You can run it yourself to see how it behaves. 

In the future I hope to replace it with some simple roms that are easy to understand, and which have sourcecode provided here.

## Current Tests

* rom-execution-assembly-variables.js: Demonstrate reading the values of assembly language variables 
* rom-execution-c-variables.js: Demonstrate reading the values of C language variables
* rom-execution-data-range.js: Demonstrate reading out an array of values from memory.
* rom-execution-raw-address.js: Demonstrate reading using raw addresses.
* rom-execution-writing-variables.js: Demonstrate the ability to write values into variables to affect tests
* rom-file-integrity.js: Demonstrate the static rom analysis functions built into the library.