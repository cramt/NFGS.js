import { EventEmitter } from "events";

interface NFGSCommand {
    command: "print" | "event" | "exception" | "get/set/call"
    eventName: string,
    data: any
}

interface GetSetCallOptionNoPromise {
    index: number;
    action: string;
    path: (string | number)[];
}

interface GetSetCallOption extends GetSetCallOptionNoPromise {
    resolve: (value?: any) => void;
    reject: (value?: any) => void;
}

let getSetCallOptionsIndex = 0;

declare class PromiseProxy {
    
    [key: string]: Promise<any> | ((...args: any[]) => Promise<any>) | any
    [key: number]: Promise<any> | ((...args: any[]) => Promise<any>) | any

}

class NFGSHandlerClass {
    private getSetCallOptions = new Map<string, GetSetCallOption>()
    private addToGetSetCallOptions(_options: GetSetCallOptionNoPromise): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const index = (getSetCallOptionsIndex++) + ""
            let options = (_options as GetSetCallOption)
            options.resolve = resolve
            options.reject = reject
            this.getSetCallOptions.set(index, options)
            this.stdoutSend({
                command: "get/set/call",
                eventName: index + "",
                data: options
            })
        })
    }

    private createProxy(envIndex: number, path: (string | number)[]): PromiseProxy {
        const _this = this;
        return new Proxy(() => { }, {
            get(_target, prop) {
                if (typeof prop === "symbol") {
                    return _this.addToGetSetCallOptions({
                        index: envIndex,
                        path,
                        action: "get"
                    })
                }
                return _this.createProxy(envIndex, [...path, prop])
            },
            set(_target, prop, value) {
                _this.addToGetSetCallOptions({
                    index: envIndex,
                    path,
                    action: "set=" + JSON.stringify(value)
                })
                return true;
            },
            apply(_target, _thisArg, args) {
                return _this.addToGetSetCallOptions({
                    index: envIndex,
                    path,
                    action: "call(" + JSON.stringify(args) + ")"
                })
            }
        }) as any as PromiseProxy
    }
    public getLuaEnviroment(env: number | "global") {
        if (env === "global") {
            env = -1
        }
        return this.createProxy(env, [])
    }
    private stdoutSend(arg: NFGSCommand) {
        process.stdout.write(JSON.stringify(arg) + "\r\n");
    }
    send(eventName: string, data: any) {
        this.stdoutSend({
            command: "event",
            eventName: eventName,
            data: data
        })
    }
    public eventHandler = new EventEmitter();
    print(arg: any) {
        this.stdoutSend({
            command: "print",
            data: arg,
            eventName: ""
        })
    }
    constructor() {
        process.stdin.on("data", (args: any[]) => {
            try {
                Buffer.from(args).toString().split("\n").forEach(str => {
                    let data: NFGSCommand = JSON.parse(str)
                    if (data.command == "event") {
                        this.eventHandler.emit(data.eventName, data.data)
                    }
                    console.log(data.command)
                    if (data.command == "get/set/call") {
                        const getSetCall = this.getSetCallOptions.get(data.eventName + "")
                        if (getSetCall) {
                            if (data.data.___exception) {
                                getSetCall.reject(data.data.___exception)
                            }
                            else {
                                getSetCall.resolve(data.data)
                            }
                            this.getSetCallOptions.delete(data.eventName)
                        }
                    }
                })
            }
            catch (e) {

            }
        })
        process.on("unhandledRejection", (reason) => {
            this.stdoutSend({
                data: reason,
                eventName: "unhandledRejection",
                command: "exception"
            })
        })
        process.on("uncaughtException", (reason) => {
            this.stdoutSend({
                data: reason,
                eventName: "uncaughtException",
                command: "exception"
            })
            process.exit(1);
        })
    }
}


const NFGSHandler = new NFGSHandlerClass();
(console as any).oldLog = console.log
console.log = (() => {
    return (message?: any, ...optionalParems: any[]) => {
        let arg: any = {}
        if (optionalParems.length === 0) {
            arg = message
        }
        else {
            arg = [message].concat(optionalParems)
        }
        NFGSHandler.print(arg)
    }
})()
export { NFGSHandler }