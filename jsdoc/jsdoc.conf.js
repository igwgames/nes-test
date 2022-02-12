const path = require('path');
module.exports = {
    "source": {
        "includePattern": ".+\\.js$", 
        "include": ["."],                      
        "exclude": ["node_modules"]
    },
    plugins: [
        "plugins/markdown",
    
    ],
    "recurseDepth": 10,
    "opts": {
        "destination": "./docs/", 
        "recurse": true,
        "readme": path.join(__dirname, '..', 'README.md')
    },
}
