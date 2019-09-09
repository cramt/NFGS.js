import { EventEmitter } from "events";

interface NFGSSendable {
    command: "print" | "event" | "exception" | "init"
    eventName: string,
    data: any
}
interface NFGSReceivable {
    eventName: string,
    data: any
}
class NFGSHandlerClass {
    private stdoutSend(arg: NFGSSendable) {
        process.stdout.write(JSON.stringify(arg) + ";" + "\r\n");
    }
    sendMessage(eventName: string, data: any) {
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
            let str = Buffer.from(args).toString()
            if (str.trim() === "init") {
                if (this.loadInitResolver !== null) {
                    this.loadInitResolver(true)
                }
                return
            }
            let data: NFGSReceivable = JSON.parse(str)
            this.eventHandler.emit(data.eventName, data.data)
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
    public isLoaded: boolean | null = null;
    private loadInitResolver: ((value?: boolean | PromiseLike<boolean> | undefined) => void) | null = null
    Load(timeout = 1000, id = ""): Promise<boolean> {
        return Promise.race([new Promise<boolean>((resolve, reject) => {
            this.stdoutSend({
                command: "init",
                eventName: "init",
                data: id
            })
            this.loadInitResolver = resolve
        }), new Promise<boolean>((resolve, reject) => {
            setTimeout(() => {
                resolve(false)
            }, timeout)
        })]).then(isLoaded => {
            this.isLoaded = isLoaded;
            return isLoaded;
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