#!/usr/bin/env node
'use strict';
const net = require('net');
const repl = require('repl');
const fs = require('fs');
const vm = require('vm');
const SOCKET_PATH = '/tmp/repl.sock';

module.exports = (ctx, opt = {path: SOCKET_PATH})=>{
    if (opt.path)
    {
        try {
            fs.statSync(opt.path);
            fs.unlinkSync(opt.path);
        } catch(err) {}
    }
    net.createServer(socket=>{
        socket.write('*** REPL Interface ***\n');
        let {context} = repl.start({
            prompt: '> ',
            eval: (cmd, context, filename, cb)=>{
                try {
                    let res = vm.runInContext(cmd, context);
                    if (res && typeof res.then=='function')
                        res.then(res=>cb(null, res), cb);
                    else
                        cb(null, res);
                } catch(err) { cb(err); }
            },
            input: socket,
            output: socket,
            terminal: true,
        }).on('exit', ()=>socket.end());
        Object.assign(context, ctx);
    }).listen(opt);
};

if (!module.parent)
{
    let argv = process.argv.slice(2), opt;
    switch (argv.length)
    {
    case 0:
    case 1:
        opt = {path: argv[0]||SOCKET_PATH};
        break;
    case 2:
        opt = {host: argv[0], port: +argv[1]};
        break;
    default:
        return console.log('invalid parameters');
    }
    let socket = net.connect(opt, ()=>{
        process.stdin.resume();
        process.stdin.setRawMode(true);
    }).on('close', ()=>{
        process.stdin.setRawMode(false);
        process.stdin.pause();
        socket.removeAllListeners('close');
    });
    process.stdin.pipe(socket).pipe(process.stdout);
    process.stdin.on('end', ()=>socket.destroy());
}
