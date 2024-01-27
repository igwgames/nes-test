const path = require('path');
module.exports = {
    "source": {
        "includePattern": ".+\\.js$", 
        "include": ["."],                      
        "exclude": ["node_modules", "docs"]
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
        "theme_opts": {
            theme: "light",
            menu: [
                {
                    "title": "Github",
                    "link": "https://gh.nes.science/nes-test/",
                    "target": "_blank"
                }        
            ],
            add_scripts: "document.querySelectorAll('.accordion').forEach(e => toggleAccordion(e, true))",
        }
    }
}
