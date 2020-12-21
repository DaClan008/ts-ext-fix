let fs = require("fs");
let path = require("path");

let files = {};
let filters = [];
let max = 2;
let base = "";

/**
 * get all the js files that is needed
 * @param {string} folder the folder to start getting all files from. 
 */ 
function getFilesAsync (folder) {
    if (!fs.existsSync(folder)) return;
    if (!fs.lstatSync(folder).isDirectory()) return;

    return new Promise((res, rej) => {
        var extTest = new RegExp(`\\.[^.]{1,${max}}$`);
        
        fs.readdir(folder, async (err, items) => {
            if (err) return rej(err);

            for(let i =0; i < items.length; i++) {
                let file = items[i];
                let current = path.join(folder, file);
                if (fs.lstatSync(current).isDirectory()) await getFilesAsync(current);
                else {
                    let test = extTest.exec(file);
                    if (test == null) return;
                    let ext = test[0].substr(1);
                    if (!filters.includes(ext)) return;
                    let reg = new RegExp(test + "$")
                    files[current.replace(reg, "")] = {
                        folder, name: file.replace(reg, ""), ext, full: current
                    };
                }
            }
            res();
        });
    });
    

}

function confirmText(details, idx, text) {
    if (details.length <= idx + text.length - 1) return false;
    for(let i = 0; i < text.length; i++) {
        if (details[idx + i] !== text[i]) return false;
    }
    return  true;
}

function getFileValue(value, folder) {
    // get current folder
    let f = path.resolve(folder, value);
    // see if exists
    if (files[f]) return `${value}.${files[f].ext}`;
    f = path.resolve(base, value);
    if (files[f]) return `${value}.${files[f].ext}`;
    return value;
}

function parseDetails(details, folder) {
    let value = "";

    let imprt = false;
    let frm = false;
    let confirm = false;
    let current = "";
    for(let i = 0; i < details.length; i++) {
        let char = details[i];

        switch(char) {
            case "i":
                if ((imprt || frm) && confirm) {
                    current += char;
                } else {
                    imprt = confirmText(details, i, "import");
                    if (imprt) {
                        value += "import";
                        i+= 5;
                    }
                }
                break;
            case "f": 
                if ((imprt || frm) && confirm) {
                    current += char;
                } else {
                    frm = confirmText(details, i, "from");
                    if (frm) {
                        value += "from";
                        i+=3;
                    }
                }
                break;
            case "\"":
            case "'":
                if (frm || imprt) {
                    if (confirm) {
                        value += getFileValue(current, folder);
                        current = "";
                    }
                    confirm = !confirm;
                }
                value += char;
                break;
            default:
                if (confirm) current += char;
                else {
                    if (!/[\t \r\n]/.test(char) && (imprt || frm)) {
                        imprt = false;
                        frm = false;
                    }
                    value += char;
                }
                break;
        }
    }
    return value;
}

/**
 * Main worker to change files if needs be
 */
async function changeFiles() {
    console.log("enter files");
    let reg = /from ['"]([^'"]*)['"]/g;
    for(let key in files) {
        let details = fs.readFileSync(files[key].full).toString();
        if (details === null || details === "") continue; 
        let parsed = parseDetails(details, files[key].folder);
        if(details !== parsed) fs.writeFileSync(files[key].full, parsed);
    }
}

export async function recompile(rootFolder, filter, baseFolder) {
    base = baseFolder || "";
    if (filter != null) {
        if (Array.isArray(filter)) filters = filter;
        else if(typeof(filter) === 'string') filters.push(filter);
        else filters.push('js');
    } else filters.push('js');
    var root = path.resolve(rootFolder || ".");

    filters.forEach(filter => max = Math.max(filter.length, max));
    let x = await getFilesAsync(root);

    changeFiles();
}
