

const execnpkg = async() => {

    // Get the list of arguments after the first 2 arguments.
    // For now the command to run is of the form "node index xyz"
    // The below line extracts arguments from "xyz" onwards
    let args = process.argv.splice(2);

    // Checking if the npkg is initialized or not.
    // If not then we force them to initialization
    if(!isInit() && args[0] !=='init')
    {
        console.log("npkg not initialized. Please use the command node index init.");
        process.exit();
    }
    else if(!isInit() && args[0] === 'init')
    {
        init();
    }
    else if(isInit() && args[0] === 'init')
    {
        console.log("Fucker its already initialized!");
    }

    // The code segment that handles the command "node index install packageName=semverString"
    if(args[0] === 'install' && args[1]!==undefined) {
        let new_args = args[1].split('=');
        let pkgName = new_args[0];
        let version = new_args[1];

        // getCurrentDList checks the npkg.json file to get the list of top level packages
        let currentDependencies = getCurrentDList();
        try{
            if(_.some(currentDependencies,{pkgName,version})) {
                console.log("Package already exists with the same version");
                return;
            }
        }
        catch(err){
            console.log(err);
        }

        let dList = await resolveDependencies({pkgName, version});

        try {
            dList.forEach(dependency => {
                downloadPkg(dependency);
            });
            addToNpkg({pkgName, version});
            addToNpkgLock(dList);

        }
        catch (err) {
            console.log(err);
        }
    }
    else if(args[0]==='install' && args[1]===undefined)
    {
        // getCurrentDList checks the npkg.json file to get the list of top level packages
        let currentDependencies = getCurrentDList();

        currentDependencies.forEach(async (dependency) => {
            let dList = await resolveDependencies(dependency);

            try {
                dList.forEach(dependency => {
                    downloadPkg(dependency);
                });
            }
            catch (err) {
                console.log(err);
            }
        });
    }
};

// Helper function to run the program.
// Will be replaced with a better function in production env
async function display() {
    execnpkg();
}

display();