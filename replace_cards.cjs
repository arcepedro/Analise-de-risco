const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// List Cards
content = content.replace(/bg-white\/5 backdrop-blur-2xl border border-white\/5 rounded-2xl border border-white\/10 p-5 flex flex-col gap-4 text-left hover:border-lime-500\/50 hover:bg-white\/5 border border-white\/10\/50 transition-all group relative overflow-hidden/g, 'bg-white/5 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-4 hover:bg-white/10 transition-all group relative overflow-hidden');
content = content.replace(/bg-white\/5 backdrop-blur-2xl border border-white\/5 rounded-2xl border border-white\/10 p-5 flex flex-col gap-4 text-left hover:border-red-500\/50 hover:bg-white\/5 border border-white\/10\/50 transition-all group relative overflow-hidden/g, 'bg-white/5 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-4 hover:bg-white/10 transition-all group relative overflow-hidden');

// Other cards
content = content.replace(/bg-black\/50 p-4 rounded-2xl border border-white\/10\/50/g, 'bg-white/5 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-4');
content = content.replace(/bg-black\/50 p-6 rounded-2xl border border-white\/10\/50/g, 'bg-white/5 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-6');
content = content.replace(/bg-black\/50 border border-white\/10\/50 p-4 rounded-2xl/g, 'bg-white/5 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-4');

// Buttons
content = content.replace(/w-full py-4 bg-zinc-100 hover:bg-white text-zinc-900 rounded-2xl font-mono font-bold text-xs transition-all uppercase tracking-\[0\.2em\] shadow-xl/g, 'w-full py-3 bg-gradient-to-r from-[#76b82a] to-[#008000] text-black font-black uppercase tracking-widest rounded-xl shadow-xl shadow-[#76b82a]/20 transition-all');
content = content.replace(/w-full bg-amber-500 text-zinc-900 py-4 rounded-2xl font-mono font-bold hover:bg-amber-400 active:scale-95 transition-all uppercase tracking-\[0\.2em\] text-xs shadow-xl flex items-center justify-center gap-2/g, 'w-full py-3 bg-gradient-to-r from-[#f59e0b] to-[#b45309] text-black font-black uppercase tracking-widest rounded-xl shadow-xl shadow-[#f59e0b]/20 transition-all flex items-center justify-center gap-2');
content = content.replace(/w-full bg-zinc-100 text-zinc-900 py-5 rounded-2xl font-mono font-bold hover:bg-white active:scale-95 transition-all uppercase tracking-\[0\.2em\] text-sm shadow-xl/g, 'w-full py-3 bg-gradient-to-r from-[#76b82a] to-[#008000] text-black font-black uppercase tracking-widest rounded-xl shadow-xl shadow-[#76b82a]/20 transition-all');
content = content.replace(/w-full sm:flex-\[2\] flex items-center justify-center gap-3 py-4 sm:py-5 rounded-2xl font-mono font-bold text-sm text-zinc-900 bg-zinc-100 hover:bg-white active:scale-\[0\.98\] transition-all shadow-xl uppercase tracking-widest/g, 'w-full sm:flex-[2] flex items-center justify-center gap-3 py-3 rounded-xl font-black text-black bg-gradient-to-r from-[#76b82a] to-[#008000] active:scale-[0.98] transition-all shadow-xl shadow-[#76b82a]/20 uppercase tracking-widest');
content = content.replace(/w-full sm:flex-\[2\] flex items-center justify-center gap-3 py-4 sm:py-5 rounded-2xl font-mono font-bold text-sm text-white bg-\[#008000\] hover:bg-\[#76b82a\] active:scale-\[0\.98\] transition-all shadow-xl shadow-lime-900\/20 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed/g, 'w-full sm:flex-[2] flex items-center justify-center gap-3 py-3 rounded-xl font-black text-black bg-gradient-to-r from-[#76b82a] to-[#008000] active:scale-[0.98] transition-all shadow-xl shadow-[#76b82a]/20 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed');

// Secondary buttons
content = content.replace(/w-full sm:flex-1 flex items-center justify-center gap-3 py-4 sm:py-5 rounded-2xl font-mono font-bold text-xs text-white\/60 bg-white\/5 border border-white\/10 hover:bg-zinc-750 hover:text-white transition-all border border-white\/10 uppercase tracking-widest/g, 'w-full sm:flex-1 flex items-center justify-center gap-3 py-3 rounded-xl font-black text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest');

// Danger buttons
content = content.replace(/w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-mono font-bold text-xs transition-all uppercase tracking-\[0\.2em\] shadow-xl active:scale-95 flex items-center justify-center gap-2/g, 'w-full py-3 bg-gradient-to-r from-[#f43f5e] to-[#be123c] text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-[#f43f5e]/20 transition-all flex items-center justify-center gap-2');
content = content.replace(/flex-\[2\] py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-mono font-bold text-sm uppercase tracking-widest shadow-xl shadow-red-900\/20 disabled:opacity-50 disabled:cursor-not-allowed/g, 'flex-[2] py-3 bg-gradient-to-r from-[#f43f5e] to-[#be123c] text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-[#f43f5e]/20 disabled:opacity-50 disabled:cursor-not-allowed');

// Cancel buttons
content = content.replace(/w-full py-4 bg-white\/5 border border-white\/10 hover:bg-white\/10 text-white rounded-2xl font-mono font-bold text-xs transition-all uppercase tracking-\[0\.2em\] active:scale-95/g, 'w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase tracking-widest rounded-xl transition-all active:scale-95');
content = content.replace(/flex-1 py-4 bg-white\/5 border border-white\/10 text-white\/60 rounded-2xl font-mono font-bold text-xs uppercase tracking-widest border border-white\/10/g, 'flex-1 py-3 bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all');

// Typography
content = content.replace(/font-mono font-bold/g, 'font-black');
content = content.replace(/text-4xl font-mono font-bold text-white uppercase tracking-tighter/g, 'text-4xl font-black text-white uppercase tracking-tighter');

fs.writeFileSync('src/App.tsx', content);
