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
        "readme": path.join(__dirname, '..', 'README.md'),
        "template": "./node_modules/clean-jsdoc-theme",
        "tutorials" :"./jsdoc/tutorials",
        // FIXME: Can we force stuff to start open?
        "theme_opts": {
            theme: "light",
            menu: [
                {
                    "title": "Github",
                    "link": "https://github.com/cppchriscpp/nes-test/",
                    "target": "_blank"
                }        
            ],
            add_scripts: "console.info('beef'); document.querySelectorAll('.accordion').forEach(e => toggleAccordion(e, true))",
        }
    }
}
