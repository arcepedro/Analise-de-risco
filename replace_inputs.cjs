const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/bg-black border border-white\/10 rounded-2xl focus:ring-2 focus:ring-red-500\/50 focus:border-red-500 outline-none transition-all text-white font-mono placeholder:text-zinc-700/g, 'bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#f43f5e]/50 outline-none');
content = content.replace(/bg-black border border-white\/10 rounded-2xl focus:ring-2 focus:ring-red-500\/50 focus:border-red-500 outline-none transition-all text-white font-mono/g, 'bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#f43f5e]/50 outline-none');

content = content.replace(/bg-black border border-white\/10 rounded-2xl focus:ring-2 focus:ring-lime-500\/50 focus:border-lime-500 outline-none transition-all text-white font-mono placeholder:text-zinc-700/g, 'bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#76b82a]/50 outline-none');
content = content.replace(/bg-black border border-white\/10 rounded-2xl focus:ring-2 focus:ring-lime-500\/50 focus:border-lime-500 outline-none transition-all text-white font-mono/g, 'bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#76b82a]/50 outline-none');

content = content.replace(/bg-black border border-white\/10 rounded-xl focus:ring-1 focus:ring-lime-500 outline-none text-white font-mono text-xs opacity-70/g, 'bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#76b82a]/50 outline-none text-xs opacity-70');
content = content.replace(/bg-black border border-white\/10 rounded-xl focus:ring-1 focus:ring-red-500 outline-none text-white font-mono text-xs/g, 'bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#f43f5e]/50 outline-none text-xs');
content = content.replace(/bg-black border border-white\/10 rounded-xl focus:ring-1 focus:ring-lime-500 outline-none text-white font-mono text-xs/g, 'bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#76b82a]/50 outline-none text-xs');

fs.writeFileSync('src/App.tsx', content);
