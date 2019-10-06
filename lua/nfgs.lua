require("subprocess_plugin")

__SUBPROCESS = __SUBPROCESS or {}
for i, v in pairs(__SUBPROCESS) do
    v:kill()
end

function initNode(path, options)
    options = options or {}
    options.commandLineArguments = options.commandLineArguments or {}
    if(options.debugPort) then
        table.insert(options.commandLineArguments, "--inspect-brk=" .. options.debugPort)
    end
    local cmdArg = table.concat(options.commandLineArguments, " ")
    if(cmdArg ~= "") then
        cmdArg = cmdArg .. " ";
    end
    local returnObj = {
        listeners = {},
        ptr = ___SUBPROCESS___WRAPPER___TABLE___.instantiate("node " .. cmdArg .. path),
        running = true,
    }
    __NFGS[returnObj.ptr] = returnObj;
    hook.Add("Tick", returnObj.ptr, function()
        if(returnObj.running) then
            returnObj:think()
        end
    end)
    function returnObj:addListener(key, func)
        self.listeners[key] = self.listeners[key] or {}
        table.insert(self.listeners[key], func)
    end
    function returnObj:listen(key, func)
        self:addListener(key, func)
    end
    function returnObj:removeListener(key, func)
        table.remove(self.listeners[key], func)
    end
    function returnObj:think()
        local nodeCommands = ___SUBPROCESS___WRAPPER___TABLE___.think(self.ptr);
        if(nodeCommands == nil) then
            return nil;
        end
        if(nodeCommands == false) then
            self.running = false;
            return false;
        end
        for _, v in pairs(nodeCommands) do
            local command = util.JSONToTable(v)
            if(!command) then
              ErrorNoHalt("Unknown command? " .. v)
              
              continue
            end
            if(command.command == "event" or command.command == "exception") then
                local listeners = self.listeners[command.eventName] or {}
                for _, f in pairs(listeners) do
                    f(command.data)
                end
            end
            if(command.command == "print" and options.debug) then
                if (type(command.data) == "table" and PrintTable) then
                  PrintTable(command.data)
                else
                  print(command.data)
                end
            end
            if(command.command == "exception") then
                if (options.debug) then
                  print(command.eventName + " happened: " + command.data)
                end
                
                if(command.eventName == "uncaughtException") then
                    self:kill()
                end
            end
        end
        return true
    end
    function returnObj:kill()
        running = false
        hook.Remove("Tick", returnObj.ptr)
        ___SUBPROCESS___WRAPPER___TABLE___.kill(self.ptr)
    end
    function returnObj:send(key, data)
        ___SUBPROCESS___WRAPPER___TABLE___.send(self.ptr, util.TableToJSON({
            eventName = key,
            data = data
        }))
    end
    return returnObj;
end
