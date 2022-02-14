nes-test has the ability to read debug symbols created by ca65 and cc65, allowing you to access
things using the variable names in your code!

This is used in most of the memory Methods implemented in {@link NesEmulator}

## How can I make it work?

This tool expects files in the same file/format as Mesen. As such, 
[Mesen's Documentation on emulator symbols](https://www.mesen.ca/docs/debugging/debuggerintegration.html#cc65-ca65)
may help.

In short, when you run ca65 or cc65, pass the `--debug-info` flag. When you run the linker, pass the
`--dbgfile` argument with the same name you use for the rom. Your link command might look something
like this: 

```cl65 -C config.conf -o mygame.nes --dbgfile mygame.dbg *.o nes.lib```

You'll need a modern version of cc65 to make this work - older versions use an incompatible
version. 

If you are able to see all of your symbols in Mesen, they will also be available in the tool.