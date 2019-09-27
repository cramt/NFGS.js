# node for gmod server js
this is the npm module used for interacting with a gmod server

example with express
```ts
import { NFGSHandler } from "nfgs.js"
let i = 0;
NFGSHandler.eventHandler.on("add", data => {
    i += data.toAdd;
})
function main() {
    NFGSHandler.sendMessage("hello", { index: i++ })
    setTimeout(main, 1000)
}
main();

```