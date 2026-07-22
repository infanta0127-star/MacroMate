import React, { useState, useRef } from 'react';
import { Copy, Trash2, Plus, MousePointer2, Target, Sword, Volume2, Clock, Check, Search } from 'lucide-react';
import jobSkillsData from './data/jobSkills.json';

const QUICK_SKILLS = [
  "地星", "庇護所", "野戰治療陣", "百合鈴", "大天使之翼", "挑釁", "退避", "即刻詠唱", "復活"
];

type Category = 'ground' | 'self' | 'ally' | 'enemy';

const CATEGORIES = [
  { id: 'ground', name: '指定地板' },
  { id: 'self', name: '自身範圍' },
  { id: 'ally', name: '指定友方' },
  { id: 'enemy', name: '指定敵方' }
];

const TEMPLATES = {
  ground: [
    { id: 'gtoff', name: '游標位置 (gtoff)', action: 'gtoff' },
    { id: 't', name: '目標腳下 (<t>)', action: '<t>' },
    { id: 'me', name: '自身腳下 (<me>)', action: '<me>' }
  ],
  self: [
    { id: 'none', name: '正常施放', action: '' }
  ],
  ally: [
    { id: 't', name: '當前目標 (<t>)', action: '<t>' },
    { id: 'mo', name: '游標指向 (<mo>)', action: '<mo>' },
    { id: 'tt', name: '目標的目標 (<tt>)', action: '<tt>' },
    { id: 'f', name: '焦點目標 (<f>)', action: '<f>' },
    { id: 'party', name: '隊伍成員', action: '' }
  ],
  enemy: [
    { id: 't', name: '當前目標 (<t>)', action: '<t>' },
    { id: 'mo', name: '游標指向 (<mo>)', action: '<mo>' },
    { id: 'tt', name: '目標的目標 (<tt>)', action: '<tt>' },
    { id: 'f', name: '焦點目標 (<f>)', action: '<f>' }
  ]
};

export default function App() {
  const [skillName, setSkillName] = useState("地星");
  const [selectedJob, setSelectedJob] = useState("astrologian");
  const [skillSearch, setSkillSearch] = useState("");
  const [macroText, setMacroText] = useState("");
  const [copied, setCopied] = useState(false);
  const [waitSec, setWaitSec] = useState(1);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [hoveredSkill, setHoveredSkill] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (skill: any, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    
    let left = rect.right + 12;
    if (left + 288 > window.innerWidth) {
      left = rect.left - 288 - 12;
    }
    
    let top = rect.top;
    if (top + 260 > window.innerHeight) {
      top = window.innerHeight - 260 - 12;
    }
    if (top < 12) top = 12;
    
    setTooltipPos({ top, left });
    setHoveredSkill(skill);
  };

  const handleMouseLeave = () => {
    setHoveredSkill(null);
  };

  const [config, setConfig] = useState({
    category: 'ground' as Category,
    template: 'gtoff',
    useMicon: true,
    useChat: false,
    chatChannel: '/p',
    chatMessage: '已對 <t> 使用！',
    partyNumber: 2
  });

  const handleCategoryChange = (cat: Category) => {
    setConfig(prev => ({
      ...prev,
      category: cat,
      template: TEMPLATES[cat][0].id
    }));
  };

  const appendWait = () => {
    setMacroText(prev => {
      let trimmed = prev.trimEnd();
      if (!trimmed) return `<wait.${waitSec}>\n`;
      if (trimmed.match(/<wait\.\d+>$/)) {
        return trimmed.replace(/<wait\.\d+>$/, `<wait.${waitSec}>`) + '\n';
      }
      return trimmed + ` <wait.${waitSec}>\n`;
    });
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight;
        textAreaRef.current.focus();
      }
    }, 0);
  };

  const generateMacroBlock = (skill: string) => {
    const lines = [];
    if (config.useMicon) lines.push(`/micon "${skill}"`);
    lines.push(`/merror off`);
    
    let action = '';
    if (config.category === 'ally' && config.template === 'party') {
      action = `<${config.partyNumber || 2}>`;
    } else {
      const tpl = TEMPLATES[config.category].find(t => t.id === config.template);
      action = tpl?.action || '';
    }

    let actionStr = `/ac "${skill}"`;
    if (action) {
      actionStr += ` ${action}`;
    }
    
    if (config.category === 'ally' || config.category === 'enemy') {
      if (config.template === 'mo') {
        lines.push(actionStr);
        lines.push(`/ac "${skill}" <t>`);
      } else {
        lines.push(actionStr);
      }
    } else {
      lines.push(actionStr);
    }
    
    if (config.useChat) {
      const msg = config.chatChannel ? `${config.chatChannel} ${config.chatMessage}` : config.chatMessage;
      lines.push(msg);
    }
    
    return lines.join('\n');
  };

  const insertText = (text: string, isBlock = false) => {
    const textarea = textAreaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      let prefix = "";
      let suffix = "";
      
      if (isBlock && start > 0 && macroText[start - 1] !== '\n') {
        prefix = "\n";
      } else if (!isBlock && start > 0 && macroText[start - 1] !== ' ' && macroText[start - 1] !== '\n') {
        prefix = " ";
      }

      if (isBlock) {
        suffix = "\n";
      }

      const insertion = prefix + text + suffix;
      const newText = macroText.substring(0, start) + insertion + macroText.substring(end);
      setMacroText(newText);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
        textarea.focus();
      }, 0);
    } else {
      const prefix = (isBlock && macroText.length > 0 && !macroText.endsWith('\n')) ? '\n' : (macroText.length > 0 && !macroText.endsWith(' ') && !macroText.endsWith('\n') && !isBlock) ? ' ' : '';
      const suffix = isBlock ? '\n' : '';
      setMacroText(prev => prev + prefix + text + suffix);
    }
  };

  const handleSkillClick = (skill: string) => {
    insertText(generateMacroBlock(skill), true);
  };

  const handleCopy = async () => {
    if (!macroText) return;
    try {
      await navigator.clipboard.writeText(macroText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleClear = () => {
    setMacroText("");
    textAreaRef.current?.focus();
  };

  return (
    <div className="h-screen bg-[#0a0a0f] text-[#e2e2e2] font-sans flex flex-col overflow-hidden selection:bg-[#3b82f6]/30">
      
      {/* Header */}
      <header className="h-16 bg-[#161625] border-b border-[#c5a059]/30 flex items-center justify-between px-6 shadow-2xl shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#c5a059] to-[#8a6d3b] rounded flex items-center justify-center shadow-[0_0_15px_rgba(197,160,89,0.3)]">
            <svg viewBox="0 0 100 100" className="w-6 h-6">
              <path 
                d="M 25 75 L 25 35 L 50 60 L 75 35 L 75 75" 
                fill="none" 
                stroke="#0a0a0f" 
                strokeWidth="12" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-widest text-[#c5a059] uppercase">FF14 巨集小幫手</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none border-[1px] border-[#3b82f6]/5 m-2 z-0"></div>
        
        {/* Left Panel: Controls */}
        <aside className="w-full lg:w-[340px] bg-[#0d0d18] border-r border-[#1a1a2e] flex flex-col shrink-0 overflow-y-auto custom-scrollbar z-10">
          
          {/* Select Job */}
          <div className="p-4 border-b border-[#1a1a2e] bg-[#121220] shrink-0 flex flex-col gap-2">
            <label className="text-[10px] text-[#c5a059] uppercase tracking-widest font-bold">選擇職業</label>
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-[#3b82f6]/30 rounded text-xs px-3 py-2 uppercase tracking-tighter text-[#e2e2e2] focus:outline-none focus:border-[#c5a059] transition-colors font-bold"
            >
              {Object.entries(jobSkillsData).map(([key, job]) => (
                <option key={key} value={key}>{job.name}</option>
              ))}
            </select>
          </div>

          {/* Step 1: 巨集規則設定 */}
          <div className="flex flex-col border-b border-[#1a1a2e] shrink-0">
            <div className="p-4 bg-[#121220]">
              <h2 className="text-[10px] text-[#c5a059] uppercase tracking-widest mb-3 font-bold">1. 設定動作規則</h2>
              
              {/* Category Tabs */}
              <div className="flex bg-[#0a0a0f] rounded border border-[#1a1a2e] p-1 mb-4">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id as Category)}
                    className={`flex-1 text-[11px] py-1.5 rounded text-center transition-colors font-bold ${
                      config.category === cat.id 
                        ? 'bg-[#252545] text-[#3b82f6] shadow-sm' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Target Template */}
              <div className="space-y-2 mb-4">
                <label className="text-[10px] text-gray-500 uppercase font-bold">施放對象</label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES[config.category].map(tpl => {
                    const displayName = tpl.id === 'party' 
                      ? `隊伍成員 (<${config.partyNumber || 2}>)`
                      : tpl.name;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => setConfig({...config, template: tpl.id})}
                        className={`text-[11px] py-1.5 px-2 rounded border transition-colors text-center font-bold ${
                          config.template === tpl.id
                            ? 'bg-[#3b82f6]/20 border-[#3b82f6]/50 text-white'
                            : 'bg-[#1a1a2e] border-[#3b82f6]/20 text-gray-400 hover:bg-[#3b82f6]/10'
                        }`}
                      >
                        {displayName}
                      </button>
                    );
                  })}
                </div>

                {config.category === 'ally' && config.template === 'party' && (
                  <div className="mt-2 p-2 bg-[#1a1a2e] rounded border border-[#3b82f6]/30 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">隊伍成員編號</span>
                      <span className="text-[10px] text-[#c5a059] font-mono font-bold">&lt;{config.partyNumber || 2}&gt;</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, partyNumber: num }))}
                          className={`h-7 rounded text-xs font-bold transition-all ${
                            (config.partyNumber || 2) === num
                              ? 'bg-[#3b82f6] text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                              : 'bg-[#0a0a0f] border border-[#3b82f6]/20 text-gray-400 hover:bg-[#3b82f6]/10 hover:text-white'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2">
                 <label className="text-[10px] text-gray-500 uppercase font-bold">附加選項</label>
                 <div className="flex flex-col gap-3 mt-2">
                   <button 
                     onClick={() => setConfig({...config, useMicon: !config.useMicon})}
                     className="flex items-center gap-2 group w-max"
                   >
                     <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${config.useMicon ? 'bg-[#3b82f6] border-[#3b82f6]' : 'bg-[#1a1a2e] border-gray-600'}`}>
                       {config.useMicon && <Check className="w-3 h-3 text-white" />}
                     </div>
                     <span className="text-xs text-gray-300 group-hover:text-white transition-colors">顯示技能圖案 (/micon)</span>
                   </button>

                   <div className="flex flex-col gap-2">
                     <button 
                       onClick={() => setConfig({...config, useChat: !config.useChat})}
                       className="flex items-center gap-2 group w-max"
                     >
                       <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${config.useChat ? 'bg-[#3b82f6] border-[#3b82f6]' : 'bg-[#1a1a2e] border-gray-600'}`}>
                         {config.useChat && <Check className="w-3 h-3 text-white" />}
                       </div>
                       <span className="text-xs text-gray-300 group-hover:text-white transition-colors">發到對話框</span>
                     </button>
                     
                     {config.useChat && (
                       <div className="flex gap-2 pl-6 mt-1">
                         <select 
                           value={config.chatChannel}
                           onChange={e => setConfig({...config, chatChannel: e.target.value})}
                           className="bg-[#1a1a2e] border border-[#3b82f6]/30 rounded px-2 py-1.5 text-xs text-[#e2e2e2] focus:outline-none focus:border-[#3b82f6] shrink-0"
                         >
                           <option value="/a">團隊</option>
                           <option value="/p">隊伍</option>
                           <option value="/echo">默語</option>
                           <option value="/s">一般</option>
                           <option value="">自訂</option>
                         </select>
                         <input 
                           type="text"
                           value={config.chatMessage}
                           onChange={e => setConfig({...config, chatMessage: e.target.value})}
                           placeholder="輸入對話..."
                           className="flex-1 min-w-0 bg-[#07070c] border border-[#3b82f6]/30 rounded px-2 py-1.5 text-xs text-[#e2e2e2] focus:outline-none focus:border-[#c5a059]"
                         />
                       </div>
                     )}
                   </div>
                 </div>
              </div>

            </div>
          </div>

          {/* Step 2: Skill Input & Library */}
          <div className="p-4 border-b border-[#1a1a2e] bg-[#121220] shrink-0">
            <h2 className="text-[10px] text-[#c5a059] uppercase tracking-widest mb-3 font-bold">2. 選擇技能並加入</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="手動輸入 (例如：地星)"
                className="w-full bg-[#07070c] border border-[#3b82f6]/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#c5a059] text-[#e2e2e2] transition-colors"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSkillClick(skillName)}
                  className="px-4 py-2 bg-[#252545] hover:bg-[#3b82f6]/30 border border-[#3b82f6]/50 rounded text-xs text-white transition-colors w-full font-bold"
                >
                  加入到編輯區
                </button>
              </div>
              <div className="relative mt-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  placeholder="搜尋職業技能..."
                  className="w-full bg-[#1a1a2e] border border-[#3b82f6]/20 rounded pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#3b82f6]/50 text-[#e2e2e2]"
                />
              </div>
            </div>
          </div>
          <div className="p-4 shrink-0">
            <div className="grid grid-cols-4 gap-2">
              {(jobSkillsData[selectedJob as keyof typeof jobSkillsData]?.skills || [])
                .filter((skill: any) => skill.name.toLowerCase().includes(skillSearch.toLowerCase()))
                .map((skill: any) => (
                <button
                  key={skill.name}
                  onClick={() => handleSkillClick(skill.name)}
                  onMouseEnter={(e) => handleMouseEnter(skill, e)}
                  onMouseLeave={handleMouseLeave}
                  className="w-full h-[76px] rounded p-1 cursor-pointer group transition-all border bg-[#1a1a2e] border-[#3b82f6]/20 hover:bg-[#3b82f6]/20 hover:border-[#3b82f6]/40"
                >
                  <div className="w-full h-full rounded flex flex-col items-center justify-center p-1 transition-colors bg-[#252545] text-gray-300 group-hover:text-white">
                    {skill.icon && <img src={skill.icon} alt={skill.name} className="w-6 h-6 mb-1 rounded shadow-sm" />}
                    <span className="text-[9px] text-center leading-tight line-clamp-2 w-full">{skill.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Panel: Editor */}
        <section className="flex-1 bg-[#07070c] p-4 lg:p-6 flex flex-col relative z-10 overflow-hidden">
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-[#c5a059] text-sm font-bold uppercase tracking-tighter">Macro Editor</h2>
                <p className={`text-[10px] ${macroText.split('\n').length > 15 ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                  {macroText ? macroText.split('\n').length : 0} / 15 Lines Used
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClear}
                  className="px-3 py-1 bg-[#1a1a2e] text-xs border border-red-900/50 text-red-400 hover:bg-red-900/20 rounded transition-colors font-bold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清除
                </button>
                <button
                  onClick={handleCopy}
                  className={`px-3 py-1 rounded text-white font-bold text-xs transition-all flex items-center gap-1.5 ${
                    copied 
                      ? 'bg-green-600 shadow-[0_2px_8px_rgba(22,163,74,0.3)]' 
                      : 'bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] shadow-[0_2px_8px_rgba(59,130,246,0.3)] active:translate-y-0.5'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  複製
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-[#0a0a14] border border-[#3b82f6]/20 rounded-lg flex overflow-hidden shadow-inner min-h-[300px]">
            {/* Line Numbers Gutter */}
            <div className="w-10 bg-[#0d0d1d] border-r border-[#1a1a2e] flex flex-col items-center pt-4 text-gray-600 select-none text-xs font-mono shrink-0">
              {Array.from({ length: Math.max(15, macroText.split('\n').length) }).map((_, i) => (
                <div key={i} className={`h-[20px] leading-[20px] ${i >= 15 ? 'text-red-900/50' : ''}`}>{i + 1}</div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textAreaRef}
              value={macroText}
              onChange={(e) => setMacroText(e.target.value)}
              placeholder="在此編輯您的巨集...&#10;您可以點擊左側的版型來自動生成，或是手動輸入文字。"
              className="flex-1 w-full bg-transparent text-[#e2e2e2] p-4 resize-none focus:outline-none focus:ring-0 font-mono text-[13px] leading-[20px] whitespace-pre overflow-auto placeholder:text-gray-600"
              spellCheck="false"
            />
          </div>

          {/* Action Bar */}
          <div className="mt-4 p-4 bg-[#121220] border border-[#c5a059]/20 rounded-lg flex items-center justify-between gap-4">
             
            {/* Wait Insertion */}
            <div className="flex items-center gap-2 bg-[#1a1a2e] p-1 rounded border border-[#3b82f6]/20 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-gray-400 ml-2" />
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">Wait</span>
              <input 
                type="number" 
                min="1" 
                max="60"
                value={waitSec}
                onChange={e => setWaitSec(Number(e.target.value))}
                className="w-10 bg-transparent text-center text-sm text-[#e2e2e2] font-mono focus:outline-none placeholder:text-gray-600"
              />
              <span className="text-[11px] text-gray-500 mr-1 hidden sm:inline">sec</span>
              <button 
                onClick={appendWait}
                className="px-3 py-1.5 bg-[#3b82f6]/80 hover:bg-blue-400 rounded text-white transition-colors flex items-center justify-center shadow-md border border-blue-400/50"
                title="插入到最後一行"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Tooltip Overlay */}
          {hoveredSkill && (
            <div
              className="fixed z-50 w-72 bg-[#121220]/95 border border-[#3b82f6]/40 rounded-lg p-3 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-sm pointer-events-none text-left"
              style={{
                top: `${tooltipPos.top}px`,
                left: `${tooltipPos.left}px`,
              }}
            >
              <div className="flex gap-3">
                {hoveredSkill.icon && (
                  <img
                    src={hoveredSkill.icon}
                    alt={hoveredSkill.name}
                    className="w-10 h-10 rounded border border-[#c5a059]/50 shadow-sm"
                  />
                )}
                <div className="flex flex-col justify-center">
                  <div className="text-sm font-bold text-white leading-tight">{hoveredSkill.name}</div>
                  {hoveredSkill.classification && (
                    <span className="w-max px-1.5 py-0.5 text-[9px] font-bold bg-[#c5a059] text-[#0a0a0f] rounded mt-1">
                      {hoveredSkill.classification}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-700/50 my-2.5"></div>
              
              <div className="grid grid-cols-2 gap-y-1 text-[10px] text-gray-400 font-medium">
                <div>學習條件: <span className="text-gray-200">{hoveredSkill.level || '1級'}</span></div>
                <div>消費 MP: <span className="text-gray-200">{hoveredSkill.cost || '-'}</span></div>
                <div className="col-span-2">
                  詠唱 / 冷卻: <span className="text-gray-200">{hoveredSkill.cast || '即時'} / {hoveredSkill.recast || '-'}</span>
                </div>
                <div className="col-span-2">
                  距離 / 範圍: <span className="text-gray-200">{hoveredSkill.distantRange || '0m / 0m'}</span>
                </div>
              </div>
              
              <div className="border-t border-gray-700/50 my-2.5"></div>
              
              <div className="text-[11px] text-gray-300 leading-normal whitespace-pre-wrap font-sans">
                {hoveredSkill.description || '暫無說明'}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
