const path = require('path');
module.exports = {
    "source": {
        "includePattern": ".+\\.js$", 
        "include": ["."],                      
        "exclude": ["node_modules"]
    },
    plugins: [
        "plugins/markdown",
        "./node_modules/ub-jsdoc/plugins/sripPFromDescription",
        "./node_modules/ub-jsdoc/plugins/memberOfModule.js"
    
    ],
    "recurseDepth": 10,
    "opts": {
        "destination": "./docs/", 
        "recurse": true,
        "readme": path.join(__dirname, '..', 'README.md')
    },
}
