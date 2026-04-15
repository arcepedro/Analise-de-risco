const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/bg-zinc-950/g, 'bg-black');
content = content.replace(/bg-zinc-900/g, 'bg-white/5 backdrop-blur-2xl border border-white/5');
content = content.replace(/bg-zinc-800/g, 'bg-white/5 border border-white/10');
content = content.replace(/text-zinc-100/g, 'text-white');
content = content.replace(/text-zinc-300/g, 'text-white');
content = content.replace(/text-zinc-400/g, 'text-white/60');
content = content.replace(/text-zinc-500/g, 'text-white/40');
content = content.replace(/text-lime-500/g, 'text-[#76b82a]');
content = content.replace(/bg-lime-500/g, 'bg-[#76b82a]');
content = content.replace(/bg-lime-600/g, 'bg-[#008000]');
content = content.replace(/border-zinc-800/g, 'border-white/10');
content = content.replace(/border-zinc-700/g, 'border-white/10');
content = content.replace(/border-zinc-600/g, 'border-white/10');
content = content.replace(/bg-zinc-700/g, 'bg-white/10');
content = content.replace(/bg-zinc-600/g, 'bg-white/20');
content = content.replace(/text-lime-400/g, 'text-[#76b82a]');
content = content.replace(/text-rose-500/g, 'text-[#f43f5e]');
content = content.replace(/bg-rose-500/g, 'bg-[#f43f5e]');
content = content.replace(/bg-rose-600/g, 'bg-[#e11d48]');
content = content.replace(/text-amber-500/g, 'text-[#f59e0b]');

fs.writeFileSync('src/App.tsx', content);
