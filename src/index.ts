import { EventEmitter } from "events";

interface NFGSSendable {
    command: "print" | "event" | "exception"
    eventName: string,
    data: any
}
interface NFGSReceivable {
    eventName: string,
    data: any
}
class NFGSHandlerClass {
    private stdoutSend(arg: NFGSSendable) {
        process.stdout.write(JSON.stringify(arg))
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
            let data: NFGSReceivable = JSON.parse(Buffer.from(args).toString())
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