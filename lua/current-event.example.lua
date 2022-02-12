local event = {}

function event.doAction()
    emu.setInput(0, {start = true})
    waitFrames(60)
end

function event.getNum()
    return 1
end

return event