// cli, it has download and meta 

const fs = require('fs');

if (process.argv.length < 3) {
    console.log('usage: tini <command> [args]');
    process.exit(1);
}

const command = process.argv[2];
const args = process.argv.slice(3);

const commands = ["download", "meta"];

if (!commands.includes(command)) {
    console.log('unknown command');
    process.exit(1);
}

const url = 'http://localhost:3000/' + command + '?name=' + args[0];


const _name = args[0];

if (!_name) {
    console.log('missing name');
    process.exit(1);
}

switch (command) {
    case 'i':
    case 'install':
    case 'download':
        installDep(url);
        break;
    case 'meta':
        metaDep(url);
        break;
    default:
        throw new Error('[tin:pkg] Unknown command received: ' + command); 
}

function metaDep(url) {
    fetch(url).then(r => r.json().then(x => {
        if (!x.ok) {
            console.log(x.error);
            process.exit(1);
        }

        console.log(x.data);
    }));
}

let pkginfojson = undefined;

function installDep(url, logs = true) {
    if (pkginfojson === undefined) {
        if (fs.existsSync(process.cwd() + '/pkg.tin.json')) {
            pkginfojson = JSON.parse(fs.readFileSync(process.cwd() + '/pkg.tin.json', 'utf8'));
        } else {
            fs.writeFileSync(process.cwd() + '/pkg.tin.json', '{}');
            pkginfojson = {};
        }
    }

    fetch(url).then(r => r.json().then(x => {
        if (!x.ok) {
            console.log(x.error);
            process.exit(1);
        }

        /**
         * data is: {
         *  "filename": "content"
         * },
         * now we need to write it to disk in pkg/[pacakge name]/[filename]
         */

        pkginfojson[x.meta.name] = {
            main: "pkg/" + x.meta.name + "/" + x.meta?.main || 'UNDEFINED',
            deps: x.meta?.deps || {},
            version: x.meta?.version || 'UNDEFINED'
        }

        Object.entries(x.data).forEach(([filename, content]) => {
            const path = 'pkg/' + x.meta.name + '/' + filename;
            const dir = path.split('/').slice(0, -1).join('/');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(path, content);
        });

        
        fs.writeFileSync(process.cwd() + '/pkg.tin.json', JSON.stringify(pkginfojson, null, 4));

        if (Object.keys(x.meta?.deps || {}).length !== 0) {
            Object.keys(x.meta?.deps || {}).forEach((name) => {
                installDep('http://localhost:3000/download?name=' + name, false);
            });
        }

        if (logs)
            console.log('[tin:pkg] Installed ' + _name + ' successfully')
    }));
}
