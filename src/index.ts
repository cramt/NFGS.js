import { EventEmitter } from "events";

interface NFGSCommand {
    command: "print" | "event" | "exception" | "get/set"
    eventName: string,
    data: any
}
class NFGSHandlerClass {
    private getSetMap = new Map<string, LuaGetPromise>()
    private getSetMapIndexer = 0
    public addGetSet(arg: LuaGetPromise) {
        let i = (this.getSetMapIndexer++) + ""
        this.getSetMap.set(i, arg)
        this.stdoutSend({
            command: "get/set",
            eventName: i,
            data: arg.generate()
        })
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
                    if (data.command == "get/set") {
                        let promise = this.getSetMap.get(data.eventName)
                        if (promise) {
                            const waiter = () => {
                                if (promise!.resolver) {
                                    promise!.resolver(data.data)
                                }
                                else {
                                    setTimeout(waiter, 1)
                                }
                            }
                            waiter();
                        }
                        this.getSetMap.delete(data.eventName)
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


interface Step {
    todo: "get" | "set" | "call"
    value: string
}
class LuaGetPromise extends Promise<any> {
    private index: number
    private steps: Step[] = []
    public resolver: ((value?: any) => void) | null = null
    private constructor(index: number) {
        super((resolve, reject) => {
            this.resolver = resolve
        })
        this.index = index
    }
    public generate() {
        return JSON.stringify(this)
    }
    public static fromGlobal() {
        return new LuaGetPromise(-1)
    }
    public static fromInitData(index: number = 0) {
        return new LuaGetPromise(index)
    }
    public get(key: string) {
        this.steps[this.steps.length] = {
            todo: "get",
            value: key
        }
        return this;
    }
    public set(key: string, value: any) {
        this.steps[this.steps.length] = {
            todo: "set",
            value: key + "=" + JSON.stringify(value)
        }
        return this;
    }
    public delete(key: string) {
        this.set(key, null)
    }
    public call(key: string, ...args: any[]) {
        this.steps[this.steps.length] = {
            todo: "call",
            value: key + "(" + args.map(x => JSON.stringify(x)).join(",") + ")"
        }
    }
    public then<TResult1 = any, TResult2 = never>(onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2> {

        return super.then(onfulfilled, onrejected)
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