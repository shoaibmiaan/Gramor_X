#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Color mapping from hard-coded values to design tokens
const colorMappings = {
  // Red variants -> danger
  'bg-red-500': 'bg-danger',
  'bg-red-600': 'bg-danger',
  'text-red-500': 'text-danger',
  'text-red-600': 'text-danger',
  'border-red-500': 'border-danger',
  'border-red-600': 'border-danger',
  
  // Green variants -> success
  'bg-emerald-500': 'bg-success',
  'bg-emerald-600': 'bg-success',
  'bg-green-500': 'bg-success',
  'bg-green-600': 'bg-success',
  'text-emerald-500': 'text-success',
  'text-emerald-600': 'text-success',
  'text-green-500': 'text-success',
  'text-green-600': 'text-success',
  
  // Blue variants -> electricBlue
  'bg-blue-500': 'bg-electricBlue',
  'bg-blue-600': 'bg-electricBlue',
  'bg-sky-500': 'bg-electricBlue',
  'bg-sky-600': 'bg-electricBlue',
  'text-blue-500': 'text-electricBlue',
  'text-blue-600': 'text-electricBlue',
  'text-sky-500': 'text-electricBlue',
  'text-sky-600': 'text-electricBlue',
  
  // Yellow/Amber variants -> warning
  'bg-amber-500': 'bg-warning',
  'bg-yellow-500': 'bg-warning',
  'text-amber-500': 'text-warning',
  'text-yellow-500': 'text-warning',
  
  // Gray variants -> grayish
  'bg-gray-500': 'bg-grayish',
  'bg-gray-600': 'bg-grayish',
  'text-gray-500': 'text-grayish',
  'text-gray-600': 'text-grayish',
  'border-gray-300': 'border-lightBorder',
  'border-gray-200': 'border-lightBorder',
};

// Typography mapping from Tailwind to semantic
const typographyMappings = {
  'text-xs': 'text-caption',
  'text-sm': 'text-small',
  'text-base': 'text-body',
  'text-lg': 'text-h4',
  'text-xl': 'text-h3',
  'text-2xl': 'text-h2',
  'text-3xl': 'text-h1',
  'text-4xl': 'text-display',
  'text-5xl': 'text-displayLg',
};

function findFiles(pattern) {
  return glob.sync(pattern, { ignore: ['node_modules/**', '.git/**', 'dist/**', '.next/**'] });
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let updatedContent = content;
  let changes = [];

  // Fix color inconsistencies
  Object.entries(colorMappings).forEach(([oldColor, newColor]) => {
    const regex = new RegExp(`\\b${oldColor.replace('-', '\\-')}\\b`, 'g');
    if (updatedContent.match(regex)) {
      updatedContent = updatedContent.replace(regex, newColor);
      changes.push(`${oldColor} → ${newColor}`);
    }
  });

  // Fix typography inconsistencies
  Object.entries(typographyMappings).forEach(([oldSize, newSize]) => {
    const regex = new RegExp(`\\b${oldSize.replace('-', '\\-')}\\b`, 'g');
    if (updatedContent.match(regex)) {
      updatedContent = updatedContent.replace(regex, newSize);
      changes.push(`${oldSize} → ${newSize}`);
    }
  });

  // Write back if changes were made
  if (changes.length > 0) {
    fs.writeFileSync(filePath, updatedContent);
    console.log(`✅ Fixed ${filePath}:`);
    changes.forEach(change => console.log(`   ${change}`));
    return true;
  }
  
  return false;
}

function scanForIssues(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // Check for hard-coded colors that aren't in our mapping
  const hardCodedColors = content.match(/(?:bg|text|border)-(?:red|green|blue|yellow|amber|gray|emerald|sky)-[0-9]+/g);
  if (hardCodedColors) {
    hardCodedColors.forEach(color => {
      if (!colorMappings[color]) {
        issues.push(`Hard-coded color: ${color}`);
      }
    });
  }

  // Check for arbitrary color values
  const arbitraryColors = content.match(/(?:bg|text|border)-\\[#[0-9a-fA-F]{6}\\]/g);
  if (arbitraryColors) {
    arbitraryColors.forEach(color => {
      issues.push(`Arbitrary color: ${color}`);
    });
  }

  // Check for raw Tailwind typography
  const rawTypography = content.match(/text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)/g);
  if (rawTypography) {
    rawTypography.forEach(size => {
      if (!typographyMappings[size]) {
        issues.push(`Raw typography: ${size}`);
      }
    });
  }

  return issues;
}

function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'scan';

  console.log('🎨 Gramor_X UI Consistency Tool\\n');

  // Find all React files
  const files = [
    ...findFiles('components/**/*.{tsx,jsx}'),
    ...findFiles('pages/**/*.{tsx,jsx}'),
    ...findFiles('layouts/**/*.{tsx,jsx}'),
  ];

  console.log(`Found ${files.length} files to process\\n`);

  let totalFixed = 0;
  let totalIssues = 0;

  files.forEach(filePath => {
    if (mode === 'fix') {
      const fixed = processFile(filePath);
      if (fixed) totalFixed++;
    } else {
      const issues = scanForIssues(filePath);
      if (issues.length > 0) {
        console.log(`⚠️  Issues in ${filePath}:`);
        issues.forEach(issue => console.log(`   ${issue}`));
        console.log('');
        totalIssues += issues.length;
      }
    }
  });

  if (mode === 'fix') {
    console.log(`\\n✨ Fixed ${totalFixed} files with UI inconsistencies!`);
    console.log('\\n📝 Next steps:');
    console.log('   1. Review the changes in git diff');
    console.log('   2. Test the components in both light and dark mode');
    console.log('   3. Run the app to ensure everything looks correct');
  } else {
    if (totalIssues === 0) {
      console.log('🎉 No UI inconsistencies found!');
    } else {
      console.log(`\\nFound ${totalIssues} UI inconsistencies across ${files.length} files.`);
      console.log('\\nTo automatically fix these issues, run:');
      console.log('   node scripts/fix-ui-inconsistencies.js fix');
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, scanForIssues };