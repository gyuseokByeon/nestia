import * as path from "path";

import { HashMap } from "tstl/container/HashMap";
import { HashSet } from "tstl/container/HashSet";
import { Pair } from "tstl/utility/Pair";

export class ImportDictionary
{
    private readonly dict_: HashMap<string, Pair<boolean, HashSet<string>>> = new HashMap();

    public emplace(file: string, realistic: boolean, instance: string): void
    {
        if (file.substr(-5) === ".d.ts")
            file = file.substr(0, file.length - 5);
        else if (file.substr(-3) === ".ts")
            file = file.substr(0, file.length - 3);
        else
            throw new Error(`Error on ImportDictionary.emplace(): extension of the target file "${file}" is not "ts".`);

        let it = this.dict_.find(file);
        if (it.equals(this.dict_.end()) === true)
            it = this.dict_.emplace(file, new Pair(realistic, new HashSet())).first;
        it.second.second.insert(instance);
    }

    public toScript(outDir: string): string
    {
        const statements: string[] = [];
        for (const it of this.dict_)
        {
            const file: string = path.relative(outDir, it.first).split("\\").join("/");
            const realistic: boolean = it.second.first;
            const instances: string[] = it.second.second.toJSON();

            statements.push(`import ${!realistic ? "type " : ""}{ ${instances.join(", ")} } from "./${file}";`);
        }
        return statements.join("\n");
    }

    public listUp(): string
    {
        let content: string = ""
            + "//---------------------------------------------------------\n"
            + "// TO PREVENT THE UNUSED VARIABLE ERROR\n"
            + "//---------------------------------------------------------\n";
        for (const it of this.dict_)
            if (it.second.first === true)
                for (const instance of it.second.second)
                    content += instance + ";\n";
        return content;
    }
}