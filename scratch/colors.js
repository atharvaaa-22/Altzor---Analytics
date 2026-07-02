const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'apps', 'web', 'src');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(filePath));
        } else {
            if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = walkDir(srcDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Replace color utility classes
    const colorMap = {
        'bg-blue-600': 'bg-orange-500',
        'bg-blue-500': 'bg-orange-400',
        'bg-blue-900': 'bg-orange-900',
        'text-blue-400': 'text-orange-400',
        'text-blue-300': 'text-orange-300',
        'text-blue-50': 'text-orange-50',
        'border-blue-500': 'border-orange-500',
        'ring-blue-500': 'ring-orange-500',
        'from-blue-600': 'from-orange-500',
        'to-indigo-600': 'to-orange-600',
        'from-blue-500': 'from-orange-400',
        'to-indigo-500': 'to-orange-500',
        'from-blue-400': 'from-orange-400',
        'bg-indigo-600': 'bg-orange-600',
        'shadow-blue-600': 'shadow-orange-500'
    };

    Object.keys(colorMap).forEach(key => {
        const regex = new RegExp(key, 'g');
        if (regex.test(content)) {
            content = content.replace(regex, colorMap[key]);
            changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
    }
});
console.log('Color scheme updated.');
