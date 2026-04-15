const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Colors
content = content.replace(/text-zinc-600/g, 'text-white/40');
content = content.replace(/text-zinc-700/g, 'text-white/40');
content = content.replace(/text-zinc-800/g, 'text-white/20');
content = content.replace(/border-zinc-900/g, 'border-white/10');

// Specific buttons
content = content.replace(/bg-zinc-100 hover:bg-white text-zinc-900/g, 'bg-gradient-to-r from-[#76b82a] to-[#008000] text-black');
content = content.replace(/bg-zinc-100 text-zinc-900/g, 'bg-gradient-to-r from-[#76b82a] to-[#008000] text-black');

// Update border radius for those specific buttons if they were rounded-3xl or rounded-2xl
content = content.replace(/rounded-3xl/g, 'rounded-[2rem]');
content = content.replace(/rounded-2xl/g, 'rounded-xl');

fs.writeFileSync('src/App.tsx', content);
