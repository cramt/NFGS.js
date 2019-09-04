# node for gmod server js
this is the npm module used for interacting with a gmod server

example with express
```ts
import { NFGSHandler } from "nfgs.js"
import express from "express"
Promise.all([NFGSHandler.Load(1000), 
    new Promise((resolve, reject)=>{
        const app = express()
        //do other setup things that might take time in here,
        // basically do everything in here until you need nfgs
        return app
})]).then(x => {
    let isLoaded = x[0]
    if(!isLoaded){
        //it failed to load
    }
    const app = x[1]
    app.get('/', (req, res) => {
        NFGSHandler.sendMessage("http request", req)
        return res.send('Hello World!')
    })
    app.listen(port, () => console.log(`Example app listening on port ${port}!`))
})

```

NFGSHandler.Load is the function that checks if the communication with the gmod server, this returns a Promise\<boolean> and takes a timeout as the argument, the return boolean is false if the connection failed.

it is recommended that you use a Promise.all to asynchronously do the setup for your program while you wait for the Load function

you can set listeners on the NFGSHandler.eventHandler before 