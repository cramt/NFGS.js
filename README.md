# node for gmod server
this is the npm module used for interacting with a gmod server, this library relies on the subprocess plugin for gmod server, found here https://github.com/cramt/gmsv_subprocess_plugin

the lua part of this can be found in lua/nfgs.lua

```ts
import { NFGSHandler } from "nfgs.js"
let i = 0;
NFGSHandler.eventHandler.on("add", data => {
    i += data.toAdd;
})
function main() {
    NFGSHandler.send("hello", { index: i++ })
    setTimeout(main, 1000)
}
main();

```