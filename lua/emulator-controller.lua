﻿-- Run events from current_event.lua in the same folder, whenever it is updated.
-- End the program with `emu.stop(code)
eventNum = 1
currentFrame = 0
nextRunFrame = 0
interopFile = nil
-- [nes-test-replacement interopPath]

-- Way to wait a few frames, since the built-in won't work
function waitFrames(num) 
    nextRunFrame = nextRunFrame + num
end

function writeValue(name, value)
    interopFile:write("\"" .. name .. "\": " .. value .. ",\n")
end

function doFrameAction()
    currentFrame = currentFrame + 1
    if (currentFrame < nextRunFrame) then return end
    nextRunFrame = currentFrame + 1
    local event
    repeat
        event = dofile(interopPath .. "current-event.lua")
    until event and event.getNum() == eventNum
    emu.log("Ran event " .. eventNum)
    
    interopFile = io.open(interopPath .. "js-status.json", "w+")
    interopFile:write("{\n")
    event.doAction()
    eventNum = eventNum + 1
    writeValue("eventNum", eventNum)
    interopFile:write("\"frameNumber\": " .. currentFrame .. "\n}")
    interopFile:close()
end

emu.addEventCallback(doFrameAction, emu.eventType.nmi)