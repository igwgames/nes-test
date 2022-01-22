// Nasty little bit of js/v8 trickery to find the file path for the
// module that called this thing, so we can get file paths relative
// to the file that called the current function.

const path = require("path");

module.exports = function getCallingPath() {
    const stack = getStack();

    // Skip this file too
    stack.shift();

    return path.dirname(stack[1].getFileName());
}

// Does some pretty gross hackery with temporarily overriding how stack traces are generated,
// fetching the filename, then unpatching it.
function getStack() {
    const origPrepareStackTrace = Error.prepareStackTrace
    Error.prepareStackTrace = function (_, stack) {
        return stack
    }

    // Newly created error now has a full stacktrace with filenames
    const stack =  (new Error()).stack;
    Error.prepareStackTrace = origPrepareStackTrace

    // Remove this call before we send it off
    stack.shift()

    return stack;
}