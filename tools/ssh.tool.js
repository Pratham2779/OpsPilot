import { Client } from "ssh2";
import fs from 'fs';

const conn=new Client();


function connect(host, port, username, keyPath) {

    return new Promise((resolve, reject) => {

        conn.once("ready", () => {
            resolve("Connected Successfully");
        });

        conn.once("error", (err) => {
            reject(err);
        });

        const privateKey=fs.readFileSync(keyPath);

        conn.connect({
            host,
            port,
            username,
            //password,
            privateKey
        });

    });

}


function executeCMD(command) {

    return new Promise((resolve, reject) => {

        let stdout = "";
        let stderr = "";

        conn.exec(command, (err, stream) => {

            if (err) {
                return reject(err);
            }

            stream.on("data", (data) => {
                stdout += data.toString();
            });

            stream.stderr.on("data", (data) => {
                stderr += data.toString();
            });

            stream.on("close", () => {
                resolve({
                    stdout,
                    stderr
                });
            });

        });

    });

}

function disconnect() {
    return new Promise((resolve) => {
        conn.once("close", () => {
        
            resolve();
        });

        conn.destroy();
    });
}

export {
    connect,
    executeCMD,
    disconnect
};