import arg from "arg";
import {recompile} from "../index";
function convertArgsToOptions(receivedArgs) {
    const args = arg({
        '--base': String,
        '--filter': [String],
        '-b': '--base',
        '-f': '--filter'
    },
    {
        argv: receivedArgs.slice(2)
    });

    return {
        base: args['--base'] || null,
        filters: args['--filter'] || null,
        root: args._[0] || "./"
    };
}

export function cli(args) {
    var a = convertArgsToOptions(args);
    recompile(a.root, a.filters, a.base);
}