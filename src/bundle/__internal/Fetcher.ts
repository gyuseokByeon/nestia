import { AesPkcs5 } from "./AesPkcs5";
import { HttpError } from "../HttpError";
import { IConnection } from "../IConnection";
import { Primitive } from "../Primitive";

// POLYFILL FOR NODE
if (typeof global === "object"
    && typeof global.process === "object" 
    && typeof global.process.versions === "object"
    && typeof global.process.versions.node !== undefined)
(global as any).fetch = require("node-fetch");

export class Fetcher
{
    public static fetch<Output>(connection: IConnection, config: Fetcher.IConfig, method: "GET" | "DELETE", path: string): Promise<Primitive<Output>>;
    public static fetch<Input, Output>(connection: IConnection, config: Fetcher.IConfig, method: "POST" | "PUT" | "PATCH", path: string, input: Input): Promise<Primitive<Output>>;

    public static async fetch<Output>(connection: IConnection, config: Fetcher.IConfig, method: string, path: string, input?: object): Promise<Primitive<Output>>
    {
        if (config.input_encrypted === true || config.output_encrypted === true)
            if (connection.encryption === undefined)
                throw new Error("Error on nestia.Fetcher.encrypt(): the encryption password has not been configured.");

        //----
        // REQUEST MESSSAGE
        //----
        // METHOD & HEADERS
        const init: RequestInit = {
            method,
            headers: connection.headers
        };

        // REQUEST BODY (WITH ENCRYPTION)
        if (input !== undefined)
        {
            let content: string = JSON.stringify(input);
            if (config.input_encrypted === true)
            {
                const password: IConnection.IEncyptionPassword = connection.encryption instanceof Function
                    ? connection.encryption!(content, true)
                    : connection.encryption!;
                content = AesPkcs5.encode(content, password.key, password.iv);
            }
            init.body = content;
        }

        //----
        // RESPONSE MESSAGE
        //----
        // DO FETCH
        const response: Response = await fetch(`${connection.host}/${path}`, init);
        let content: string = await response.text();

        // CHECK THE STATUS CODE
        if (response.status !== 200 && response.status !== 201)
            throw new HttpError(method, path, response.status, content);

        // FINALIZATION (WITH DECODING)
        if (config.output_encrypted === true)
        {
            const password: IConnection.IEncyptionPassword = connection.encryption instanceof Function
                ? connection.encryption!(content, false)
                : connection.encryption!;
            content = AesPkcs5.decode(content, password.key, password.iv);
        }
        return JSON.parse(content);
    }
}

export namespace Fetcher
{
    export interface IConfig
    {
        input_encrypted?: boolean;
        output_encrypted: boolean;
    }
}