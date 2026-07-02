const fs = require('fs');
const path = require('path');

const features = [
  'auth',
  'chat',
  'dashboards',
  'semantic',
  'uploads',
  'connections',
  'sql-playground',
  'automations',
  'settings',
  'ai-config',
  'admin'
];

const subdirs = ['api', 'components', 'hooks', 'stores', 'types'];
// The script is in e:\Altzor - Analytics\scratch, so apps is at ..\apps
const basePath = path.join(__dirname, '..', 'apps', 'web', 'src', 'features');

features.forEach(feature => {
  const featurePath = path.join(basePath, feature);
  if (!fs.existsSync(featurePath)) {
    fs.mkdirSync(featurePath, { recursive: true });
  }
  
  subdirs.forEach(sub => {
    const subPath = path.join(featurePath, sub);
    if (!fs.existsSync(subPath)) {
      fs.mkdirSync(subPath, { recursive: true });
    }
  });

  fs.writeFileSync(path.join(featurePath, 'index.ts'), '// Public API exports for this feature\n');
});

console.log('Feature scaffolding complete!');
