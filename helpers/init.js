

// The function to check if the npkg.json file is init or not. Does the check synchronously
const isInit = () => {
    return fs.existsSync('npkg.json');
};


// The function to initialize the npkg.json file
const init = async () => {
    let initData = {
        name:"",
        version: "1.0.0",
        description:"",
        author:"",
        dependencies:{}
    };
    fs.appendFile('npkg.json', JSON.stringify(initData, null, 4), (err) => {
        if(err)
            console.log(err);
        else
            console.log("npkg File initialized!");
    });

    let lockFileData = {
        dependencies:{}
    };

    fs.appendFile('npkg-lock.json', JSON.stringify(lockFileData, null, 4), (err) => {
        if(err)
            console.log(err);
        else
            console.log("npkg lock file initialized!")
    })
};