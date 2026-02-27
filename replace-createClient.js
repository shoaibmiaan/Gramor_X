const fs = require('fs');
const path = require('path');

// Path to your source files (adjust if needed)
const directoryPath = path.join(__dirname, 'src');  // Change to your source directory

// Search and replace function
function replaceInFile(filePath) {
  let fileContent = fs.readFileSync(filePath, 'utf-8');

  // Replace createClient with supabaseBrowser
  const newContent = fileContent.replace(/createClient\([^\)]*\)/g, 'supabaseBrowser');

  // Write back the updated content
  if (fileContent !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated: ${filePath}`);
  }
}

// Traverse directory and process each file
function processFiles(directory) {
  fs.readdirSync(directory).forEach((file) => {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Recursively go into subdirectories
      processFiles(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {  // Handle TypeScript and JavaScript files
      replaceInFile(fullPath);
    }
  });
}

// Start the processing
processFiles(directoryPath);
