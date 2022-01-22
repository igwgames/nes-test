-- Run a sequence of events, as provided by the controlling js

events = {
    -- [nes-test-replacement events]

    
    -- Example events, use these for testing if debugging the base script manually.
    -- {frame = 100, type = "sendInput", value = {start = true}, controller = 0},
    -- {frame = 140, type = "sendInput", value = {start = true}, controller = 0},
    -- {frame = 150, type = "assert", asserter = function () if (emu.read(0x2fe, emu.memType.cpuDebug) == 23) then return true else return false end end },
    -- {frame = 151, type = "stop" }
}

eventIndex = 1
assertionIndex = 0
-- [nes-test-replacement stopOnErrors]

eventLookupTable = {
    sendInput = function(event)
        emu.setInput(event.controller, event.value)
    end,
    assert = function(event)
        assertionIndex = assertionIndex + 1
        if (not event.asserter()) then
            if (stopOnErrors == true) then
                emu.stop(assertionIndex)
            else
                emu.log('Would have exited with an error ' .. assertionIndex);
            end
        end
    end,
    stop = function(event) 
        if (stopOnErrors == true) then
            emu.stop(0)
        else
            emu.log('Would have exited successfully');
        end
    end
}


-- Called whenever input is polled (Probably 1x/frame, but games sometimes poll more often)
function doInput()
    -- Grab frame count from the emulator
    currentFrameCount = emu.getState().ppu.frameCount

    while (eventIndex <= #events and events[eventIndex].frame < currentFrameCount) do
        local fn = eventLookupTable[events[eventIndex].type]
        
        if (fn == nil) then 
            emu.log("Tried to call a bogus event" .. events[eventIndex].type .. " (index " .. eventIndex .. ")")
            if (stopOnErrors) then
                emu.stop(255)
            else
                emu.log("Preventing exit due to testRunner mode")
            end
        end

        fn(events[eventIndex])
        eventIndex = eventIndex + 1

    end

    -- No need to set input otherwise, it is automatically cleared out by the emulator
end

-- Set the input function to run every time input is polled
emu.addEventCallback(doInput, emu.eventType.inputPolled)