import React, { useState, useRef, useEffect } from 'react';
import { Copy, Trash2, Plus, MousePointer2, Target, Sword, Volume2, Clock, Check, Search, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import jobSkillsData from './data/jobSkills.json';

const QUICK_SKILLS = [
  "地星", "庇護所", "野戰治療陣", "百合鈴", "大天使之翼", "挑釁", "退避", "即刻詠唱", "復活"
];

type Category = 'ground' | 'self' | 'ally' | 'enemy';

const CATEGORIES = [
  { id: 'self', name: '自身範圍' },
  { id: 'ground', name: '指定地板' },
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

const JOB_GROUPS = [
  {
    name: "防護職業",
    jobs: ["paladin", "warrior", "darkknight", "gunbreaker"]
  },
  {
    name: "治療職業",
    jobs: ["whitemage", "scholar", "astrologian", "sage"]
  },
  {
    name: "近戰職業",
    jobs: ["monk", "dragoon", "ninja", "samurai", "reaper", "viper"]
  },
  {
    name: "遠程物理職業",
    jobs: ["bard", "machinist", "dancer"]
  },
  {
    name: "遠程魔法職業",
    jobs: ["blackmage", "summoner", "redmage", "pictomancer", "bluemage"]
  }
];

export default function App() {
  const [skillName, setSkillName] = useState("");
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

  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);
  const jobDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (jobDropdownRef.current && !jobDropdownRef.current.contains(event.target as Node)) {
        setIsJobDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [config, setConfig] = useState({
    category: 'self' as Category,
    template: 'none',
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
      <header className="h-12 bg-[#161625] border-b border-[#c5a059]/30 flex items-center justify-between px-6 shadow-2xl shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-gradient-to-br from-[#c5a059] to-[#8a6d3b] rounded-sm flex items-center justify-center shadow-[0_0_8px_rgba(197,160,89,0.3)]">
            <svg viewBox="0 0 100 100" className="w-3 h-3">
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
          <h1 className="text-lg font-bold tracking-widest text-[#c5a059] uppercase">FF14 巨集小幫手</h1>
        </div>
      </header>

      {/* Merged Action Rules and Settings Bar (Regions 1 & 2) */}
      <div className="bg-[#121220] border-b border-[#1a1a2e] p-3 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-[15px] shrink-0 relative z-20">
        
        {/* Column Left (1 & 4) */}
        <div className="flex flex-row md:flex-col gap-x-6 gap-y-2.5 items-center md:items-start justify-start md:justify-center border-b md:border-b-0 md:border-r border-[#1a1a2e] pb-2 md:pb-0 md:pr-8">
          {/* 1. Select Job (Custom Dropdown) */}
          <div className="flex items-center gap-2 relative" ref={jobDropdownRef}>
            <div className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>選擇職業:</span>
            </div>
            <button
              type="button"
              onClick={() => setIsJobDropdownOpen(!isJobDropdownOpen)}
              className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#0a0a0f] border border-[#22d3ee]/80 text-[#22d3ee] rounded text-[15px] font-bold transition-all focus:outline-none hover:bg-[#22d3ee]/10 w-[140px] shadow-[0_0_8px_rgba(34,211,238,0.2)]"
            >
              <span className="truncate">{jobSkillsData[selectedJob as keyof typeof jobSkillsData]?.name.replace(/（[^）]+）/g, '') || selectedJob}</span>
              {isJobDropdownOpen ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
            </button>

            {/* Dropdown Options List */}
            {isJobDropdownOpen && (
              <div className="absolute top-[calc(100%+4px)] left-[80px] w-[200px] max-h-[300px] overflow-y-auto bg-[#0d0d18] border border-[#22d3ee]/30 rounded-md shadow-2xl z-50 py-1.5 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                {JOB_GROUPS.map((group) => (
                  <div key={group.name} className="mb-2 last:mb-0">
                    {/* Group Header */}
                    <div className="px-3 py-1 text-[15px] font-bold text-[#3b82f6] uppercase tracking-wider select-none bg-[#121220]/50">
                      {group.name}
                    </div>
                    {/* Group Jobs */}
                    <div className="flex flex-col">
                      {group.jobs.map((jobKey) => {
                        const job = jobSkillsData[jobKey as keyof typeof jobSkillsData];
                        if (!job) return null;
                        const isSelected = selectedJob === jobKey;
                        return (
                          <button
                            key={jobKey}
                            type="button"
                            onClick={() => {
                              setSelectedJob(jobKey);
                              setIsJobDropdownOpen(false);
                            }}
                            className={`px-5 py-1.5 text-left text-[15px] font-medium transition-colors w-full ${
                              isSelected
                                ? 'bg-[#3b82f6]/20 text-white font-bold border-l-2 border-[#3b82f6]'
                                : 'text-gray-400 hover:bg-[#1a1a2e] hover:text-gray-200'
                            }`}
                          >
                            {job.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Options */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setConfig({...config, useMicon: !config.useMicon})}
              className="flex items-center gap-2 group w-max"
            >
              <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${config.useMicon ? 'bg-[#3b82f6] border-[#3b82f6]' : 'bg-[#1a1a2e] border-gray-600'}`}>
                {config.useMicon && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-gray-300 group-hover:text-white transition-colors">顯示技能圖案 (/micon)</span>
            </button>

            <div className="flex items-center gap-2 relative">
              <button 
                onClick={() => setConfig({...config, useChat: !config.useChat})}
                className="flex items-center gap-2 group w-max"
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${config.useChat ? 'bg-[#3b82f6] border-[#3b82f6]' : 'bg-[#1a1a2e] border-gray-600'}`}>
                  {config.useChat && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-gray-300 group-hover:text-white transition-colors">發到對話框</span>
              </button>
              
              {config.useChat && (
                <div className="absolute top-[calc(100%+4px)] left-0 bg-[#121220] border border-[#3b82f6]/50 rounded p-2 flex gap-2 z-50 shadow-2xl w-[280px]">
                  <select 
                    value={config.chatChannel}
                    onChange={e => setConfig({...config, chatChannel: e.target.value})}
                    className="bg-[#1a1a2e] border border-[#3b82f6]/30 rounded px-2 py-1 text-[15px] text-[#e2e2e2] focus:outline-none focus:border-[#3b82f6] shrink-0"
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
                    className="flex-1 min-w-0 bg-[#07070c] border border-[#3b82f6]/30 rounded px-2 py-1 text-[15px] text-[#e2e2e2] focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column Right (2 & 3) */}
        <div className="flex flex-col gap-2.5 justify-center pl-0 md:pl-2">
          {/* 2. Category Tabs */}
          <div className="flex bg-[#0a0a0f] rounded border border-[#1a1a2e] p-1 w-max">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id as Category)}
                className={`text-[15px] px-3 py-1 rounded text-center transition-colors font-bold ${
                  config.category === cat.id 
                    ? 'bg-[#252545] text-[#3b82f6] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* 3. Target Templates */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-bold uppercase whitespace-nowrap">對象:</span>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES[config.category].map(tpl => {
                const displayName = tpl.id === 'party' 
                  ? `隊伍成員 (<${config.partyNumber || 2}>)`
                  : tpl.name;
                const isSelected = config.template === tpl.id;
                return (
                  <div key={tpl.id} className="relative">
                    <button
                      onClick={() => setConfig({...config, template: tpl.id})}
                      className={`text-[15px] py-1 px-3 rounded border transition-colors text-center font-bold ${
                        isSelected
                          ? 'bg-[#3b82f6]/20 border-[#3b82f6]/50 text-white'
                          : 'bg-[#1a1a2e] border-[#3b82f6]/20 text-gray-400 hover:bg-[#3b82f6]/10'
                      }`}
                    >
                      {displayName}
                    </button>
                    
                    {/* Floating Party Number Selector */}
                    {tpl.id === 'party' && isSelected && (
                      <div className="absolute top-[calc(100%+4px)] left-1/2 -translate-x-1/2 bg-[#121220] border border-[#3b82f6]/50 rounded p-1.5 flex gap-1 z-50 shadow-2xl">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfig(prev => ({ ...prev, partyNumber: num }));
                            }}
                            className={`w-6 h-6 rounded text-[15px] font-bold transition-all ${
                              (config.partyNumber || 2) === num
                                ? 'bg-[#3b82f6] text-white'
                                : 'bg-[#0a0a0f] border border-[#3b82f6]/20 text-gray-400 hover:bg-[#3b82f6]/10'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none border-[1px] border-[#3b82f6]/5 m-2 z-0"></div>
        
        {/* Left Column (Region 3: Skill Library) */}
        <aside className="w-full lg:w-[360px] bg-[#0d0d18] border-r border-[#1a1a2e] flex flex-col shrink-0 overflow-hidden z-10 h-full">
          
          {/* Skill Input & Library */}
          <div className="p-4 border-b border-[#1a1a2e] bg-[#121220] shrink-0">
            <h2 className="text-[15px] text-[#c5a059] uppercase tracking-widest mb-3 font-bold">選擇技能並加入</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="手動輸入 (例如：地星)"
                  className="flex-1 min-w-0 bg-[#07070c] border border-[#3b82f6]/30 rounded px-3 py-2 text-[15px] focus:outline-none focus:border-[#c5a059] text-[#e2e2e2] transition-colors"
                />
                <button
                  onClick={() => {
                    if (skillName.trim()) {
                      handleSkillClick(skillName.trim());
                    }
                  }}
                  className="px-4 py-2 bg-[#252545] hover:bg-[#3b82f6]/30 border border-[#3b82f6]/50 rounded text-[15px] text-white transition-colors font-bold shrink-0 flex items-center justify-center"
                  title="加到編輯區"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="relative mt-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  placeholder="搜尋職業技能..."
                  className="w-full bg-[#1a1a2e] border border-[#3b82f6]/20 rounded pl-9 pr-3 py-1.5 text-[15px] focus:outline-none focus:border-[#3b82f6]/50 text-[#e2e2e2]"
                />
              </div>
              
              <div className="text-[15px] text-gray-500/80 mt-2 font-medium">
                點擊技能即可新增巨集內容
              </div>
            </div>
          </div>

          {/* Skill List Container (Scrollable) */}
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-4 gap-2">
              {(jobSkillsData[selectedJob as keyof typeof jobSkillsData]?.skills || [])
                .filter((skill: any) => skill.name.toLowerCase().includes(skillSearch.toLowerCase()))
                .map((skill: any) => (
                <button
                  key={skill.name}
                  onClick={() => handleSkillClick(skill.name)}
                  onMouseEnter={(e) => handleMouseEnter(skill, e)}
                  onMouseLeave={handleMouseLeave}
                  className="w-full h-[88px] rounded p-1 cursor-pointer group transition-all border bg-[#1a1a2e] border-[#3b82f6]/20 hover:bg-[#3b82f6]/20 hover:border-[#3b82f6]/40"
                >
                  <div className="w-full h-full rounded flex flex-col items-center justify-center p-1 transition-colors bg-[#252545] text-gray-300 group-hover:text-white">
                    {skill.icon && <img src={skill.icon} alt={skill.name} className="w-6 h-6 mb-1 rounded shadow-sm" />}
                    <span className="text-[15px] text-center leading-tight line-clamp-2 w-full">{skill.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Panel: Split into Editor and Tools (h-full to match Sidebar) */}
        <section className="flex-1 bg-[#07070c] p-4 lg:p-6 flex flex-col md:flex-row gap-6 relative z-10 overflow-hidden h-full">
          
          {/* Left Part: Macro Editor (1/2 width) */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-[#c5a059] text-[15px] font-bold uppercase tracking-tighter">Macro Editor</h2>
                <p className={`text-[15px] ${macroText.split('\n').length > 15 ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                  {macroText ? macroText.split('\n').length : 0} / 15 Lines Used
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClear}
                  className="px-3 py-1 bg-[#1a1a2e] text-[15px] border border-red-900/50 text-red-400 hover:bg-red-900/20 rounded transition-colors font-bold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清除
                </button>
                <button
                  onClick={handleCopy}
                  className={`px-3 py-1 rounded text-white font-bold text-[15px] transition-all flex items-center gap-1.5 ${
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

            {/* Code Box container (flex-1 to fill space) */}
            <div className="flex-1 bg-[#0a0a14] border border-[#3b82f6]/20 rounded-lg flex overflow-hidden shadow-inner min-h-[300px]">
              {/* Line Numbers Gutter */}
              <div className="w-10 bg-[#0d0d1d] border-r border-[#1a1a2e] flex flex-col items-center pt-4 text-gray-600 select-none text-[15px] font-mono shrink-0">
                {Array.from({ length: Math.max(15, macroText.split('\n').length) }).map((_, i) => (
                  <div key={i} className={`h-[22px] leading-[22px] ${i >= 15 ? 'text-red-900/50' : ''}`}>{i + 1}</div>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                ref={textAreaRef}
                value={macroText}
                onChange={(e) => setMacroText(e.target.value)}
                placeholder="在此編輯您的巨集...&#10;您可以點擊左側的版型來自動生成，或是手動輸入文字。"
                className="flex-1 w-full bg-transparent text-[#e2e2e2] p-4 resize-none focus:outline-none focus:ring-0 font-mono text-[15px] leading-[22px] whitespace-pre overflow-auto placeholder:text-gray-600"
                spellCheck="false"
              />
            </div>
          </div>

          {/* Right Part: WAIT Tools Panel (1/2 width) */}
          <div className="flex-1 flex flex-col h-full bg-[#121220] border border-[#c5a059]/20 rounded-lg p-6 justify-start overflow-y-auto custom-scrollbar">
            <div className="space-y-6">
              
              {/* Wait Insertion tool */}
              <div>
                <h3 className="text-[#c5a059] text-[15px] font-bold uppercase tracking-wider mb-3">插入延遲指令 (WAIT)</h3>
                <div className="flex items-center gap-2 bg-[#1a1a2e] p-2 rounded border border-[#3b82f6]/20 shadow-inner w-max">
                  <Clock className="w-4 h-4 text-gray-400 ml-2" />
                  <span className="text-[15px] font-bold text-gray-400 uppercase tracking-wider">Wait</span>
                  <input 
                    type="number" 
                    min="1" 
                    max="60"
                    value={waitSec}
                    onChange={e => setWaitSec(Number(e.target.value))}
                    className="w-12 bg-transparent text-center text-[15px] text-[#e2e2e2] font-mono focus:outline-none placeholder:text-gray-600"
                  />
                  <span className="text-[15px] text-gray-500 mr-2">sec</span>
                  <button 
                    onClick={appendWait}
                    className="px-4 py-2 bg-[#3b82f6]/80 hover:bg-blue-400 rounded text-white transition-colors flex items-center justify-center shadow-md border border-blue-400/50 font-bold"
                    title="插入延遲到最後一行"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* FFXIV Macro Quick Guides & Reference */}
              <div className="border-t border-[#1a1a2e] pt-4">
                <h3 className="text-[#c5a059] text-[15px] font-bold uppercase tracking-wider mb-3">快速巨集範本參考</h3>
                <div className="space-y-3.5">
                  <div className="p-3 bg-[#0a0a0f] border border-[#3b82f6]/10 rounded">
                    <div className="text-white font-bold text-[15px] mb-1">瞬發復活巨集</div>
                    <code className="text-xs text-[#22d3ee] block font-mono whitespace-pre bg-[#07070c] p-1.5 rounded select-all leading-relaxed">
                      {"/ac \"即刻詠唱\" <me> <wait.1>\n/ac \"復活\" <t>\n/ac \"復活\" <2>"}
                    </code>
                    <div className="text-xs text-gray-400 mt-1">優先對當前目標或2號隊友（常為副坦或補職）使用復活。</div>
                  </div>
                  
                  <div className="p-3 bg-[#0a0a0f] border border-[#3b82f6]/10 rounded">
                    <div className="text-white font-bold text-[15px] mb-1">地面技能 (快速施放)</div>
                    <code className="text-xs text-[#22d3ee] block font-mono whitespace-pre bg-[#07070c] p-1.5 rounded select-all leading-relaxed">
                      {"/ac \"地星\" <gtoff>\n/ac \"地星\" <t>"}
                    </code>
                    <div className="text-xs text-gray-400 mt-1">優先施放於滑鼠游標指向位置，若無則施放於當前目標腳下。</div>
                  </div>

                  <div className="p-3 bg-[#0a0a0f] border border-[#3b82f6]/10 rounded">
                    <div className="text-white font-bold text-[15px] mb-1">指定隊友發送通知</div>
                    <code className="text-xs text-[#22d3ee] block font-mono whitespace-pre bg-[#07070c] p-1.5 rounded select-all leading-relaxed">
                      {"/ac \"天星交錯\" <2>\n/p 已對 <2> 使用天星交錯！"}
                    </code>
                    <div className="text-xs text-gray-400 mt-1">對隊伍 2 號成員使用技能，並在隊伍頻道發送通知。</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
          
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
                  <div className="text-[15px] font-bold text-white leading-tight">{hoveredSkill.name}</div>
                  {hoveredSkill.classification && (
                    <span className="w-max px-1.5 py-0.5 text-[15px] font-bold bg-[#c5a059] text-[#0a0a0f] rounded mt-1">
                      {hoveredSkill.classification}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-700/50 my-2.5"></div>
              
              <div className="grid grid-cols-2 gap-y-1 text-[15px] text-gray-400 font-medium">
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
              
              <div className="text-[15px] text-gray-300 leading-normal whitespace-pre-wrap font-sans">
                {hoveredSkill.description || '暫無說明'}
              </div>
            </div>
          )}
      </main>
    </div>
  );
}
