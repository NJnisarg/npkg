
// Adds a given packageName and version to the dependency list of the npkg file.
const addToNpkg = async ({pkgName,version}) => {

    fs.readFile('npkg.json','utf8', (err, data) => {
        if(err)
            console.log(err);
        else
        {
            let fileContents = JSON.parse(data);
            fileContents.dependencies[pkgName] = version;
            fs.writeFile('npkg.json', JSON.stringify(fileContents,null,4), (err)=> {
                if(err)
                    console.log(err);
                else
                    console.log("npkg file updated with the package");
            })
        }
    })
};

// Adds a list of packages to the npkg lock file.
// Generally this contains the flat global dependency list rather than just the top level packages.
const addToNpkgLock = async (diff) => {
    fs.readFile('npkg-lock.json','utf8', (err, data) => {
        if(err)
            console.log(err);
        else
        {
            let fileContents = JSON.parse(data);
            diff.forEach((item) => {
                fileContents.dependencies[item.pkgName] = item.version;
            });

            fs.writeFile('npkg-lock.json', JSON.stringify(fileContents,null,4), (err)=> {
                if(err)
                    console.log(err);
                else
                    console.log("npkg-lock file updated with the package");
            })
        }
    })
};

// Get the current list of dependencies in the npkg.json file.
// Just gives the top level dependencies
const getCurrentDList = () => {
    let data = fs.readFileSync('npkg.json','utf8');

    let fileContents = JSON.parse(data);
    let dList = fileContents.dependencies;

    let currentDList = [];
    Object.keys(dList).forEach(key => {
        currentDList.push({ pkgName:key, version:dList[key]})
    });
    return currentDList;
};