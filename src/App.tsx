import React, { useState, useRef, useEffect } from 'react';
import { Copy, Trash2, Plus, Clock, Check, Search, Shield, ChevronDown, ChevronUp, BookOpen, Wrench, Sparkles, HelpCircle, Code2, Play } from 'lucide-react';
import jobSkillsData from './data/jobSkills.json';
import macroCommandsData from './data/macroCommands.json';

type Category = 'ground' | 'self' | 'ally' | 'enemy';
type Mode = 'builder' | 'encyclopedia';

const ENCYCLOPEDIA_CATEGORIES = [
  { id: 'all', name: '全部分類' },
  { id: 'battle', name: '戰鬥與技能' },
  { id: 'macro', name: '巨集控制' },
  { id: 'target', name: '目標與代名詞' },
  { id: 'chat', name: '隊伍與對話' },
  { id: 'ui_hotbar', name: '快捷列與 UI' },
  { id: 'marking_sound', name: '標記與音效' }
];

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
  const [activeTab, setActiveTab] = useState<Mode>('builder');
  const [skillName, setSkillName] = useState("");
  const [selectedJob, setSelectedJob] = useState("astrologian");
  const [skillSearch, setSkillSearch] = useState("");
  const [macroText, setMacroText] = useState("");
  const [copied, setCopied] = useState(false);
  const [waitSec, setWaitSec] = useState(1);
  const [advanceSec, setAdvanceSec] = useState(5);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineText, setTimelineText] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Encyclopedia states
  const [encCategory, setEncCategory] = useState("all");
  const [encSearch, setEncSearch] = useState("");
  const [selectedCmdId, setSelectedCmdId] = useState<string | null>("ac");

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
    chatMessage: '已使用！',
    partyNumber: 2
  });

  const handleCategoryChange = (cat: Category) => {
    const defaultChat = (cat === 'self' || cat === 'ground') ? '已使用！' : '已對 <t> 使用！';
    setConfig(prev => ({
      ...prev,
      category: cat,
      template: TEMPLATES[cat][0].id,
      chatMessage: defaultChat
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

  const handleConvertTimeline = () => {
    const lines = timelineText.split('\n');
    const events: { time: number; label: string }[] = [];
    
    // Matches patterns like "3:12.000 (命運之輪)" or "4:00.000 [太陽星座]"
    // Support minutes:seconds, optionally with milliseconds
    const timeRegex = /(?:^|\s)(\d+):(\d{2})(?:\.\d+)?\s+(.*)$/;
    
    for (const line of lines) {
      const match = line.match(timeRegex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const label = match[3].trim();
        events.push({
          time: minutes * 60 + seconds,
          label: label
        });
      }
    }
    
    if (events.length === 0) {
      alert("未偵測到任何有效的時間軸行（格式需包含 分:秒，例如 3:12）！");
      return;
    }
    
    // Sort events by time
    events.sort((a, b) => a.time - b.time);
    
    const adv = advanceSec;
    const outputEvents: { time: number; text: string }[] = [];
    
    if (events.length > 0) {
      // First event alert time
      const firstAlertT = Math.max(0, events[0].time - adv);
      
      // Minute boundaries before firstAlertT
      for (let b = 60; b < firstAlertT; b += 60) {
        outputEvents.push({
          time: b - 60,
          text: `/e 第${b / 60}分鐘`
        });
      }
      
      // Warning event at last minute boundary before firstAlertT
      const lastBoundary = Math.floor(firstAlertT / 60) * 60;
      outputEvents.push({
        time: lastBoundary,
        text: "/e 準備減傷"
      });
      
      // First skill event
      outputEvents.push({
        time: firstAlertT,
        text: `/e ${events[0].label}`
      });
      
      // Subsequent events
      let currentT = firstAlertT;
      for (let i = 1; i < events.length; i++) {
        const event = events[i];
        const alertT = Math.max(0, event.time - adv);
        const waitNeeded = alertT - currentT;
        
        if (waitNeeded <= 60) {
          outputEvents.push({
            time: alertT,
            text: `/e ${event.label}`
          });
          currentT = alertT;
        } else {
          // Split wait
          let t = currentT;
          t += 60;
          let remaining = waitNeeded - 60;
          
          while (remaining > 60) {
            outputEvents.push({
              time: t,
              text: `/e ${remaining}秒後開減傷`
            });
            t += 60;
            remaining -= 60;
          }
          
          if (remaining > 0) {
            outputEvents.push({
              time: t,
              text: `/e ${remaining}秒後開減傷`
            });
            t += remaining;
          }
          
          outputEvents.push({
            time: alertT,
            text: `/e ${event.label}`
          });
          currentT = alertT;
        }
      }
    }
    
    const macroLines: string[] = [];
    
    for (let i = 0; i < outputEvents.length; i++) {
      const currentEvent = outputEvents[i];
      const nextEvent = outputEvents[i + 1];
      
      if (nextEvent) {
        const wait = nextEvent.time - currentEvent.time;
        if (wait > 0) {
          macroLines.push(`${currentEvent.text} <wait.${wait}>`);
        } else {
          macroLines.push(currentEvent.text);
        }
      } else {
        macroLines.push(currentEvent.text);
      }
    }
    
    setMacroText(macroLines.join('\n'));
    setIsTimelineModalOpen(false);
  };

  const generateMacroBlock = (skill: string) => {
    const lines = [];
    if (config.useMicon) lines.push(`/micon "${skill}"`);
    lines.push(`/merror off`);
    
    let action = '';
    let targetToken = '<t>';

    if (config.category === 'ally' && config.template === 'party') {
      targetToken = `<${config.partyNumber || 2}>`;
      action = targetToken;
    } else {
      const tpl = TEMPLATES[config.category].find(t => t.id === config.template);
      action = tpl?.action || '';
      if (action && action.startsWith('<')) {
        targetToken = action;
      }
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
      let msg = config.chatMessage.trim();
      
      if (!msg || msg === '已對 <t> 使用！' || msg === '已使用！') {
        if (config.category === 'self' || config.category === 'ground') {
          msg = `已使用 ${skill}！`;
        } else {
          msg = `已對 ${targetToken} 使用 ${skill}！`;
        }
      } else {
        if (msg.includes('{skill}')) {
          msg = msg.replace(/\{skill\}/g, skill);
        } else if (msg.includes('XXX')) {
          msg = msg.replace(/XXX/g, skill);
        } else {
          msg = msg.replace(/<t>/g, targetToken);
          if (!msg.includes(skill)) {
            msg = `${msg.replace(/！$/, '')} ${skill}！`;
          }
        }
      }

      const fullMsg = config.chatChannel ? `${config.chatChannel} ${msg}` : msg;
      lines.push(fullMsg);
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

  // Filtered encyclopedia data
  const filteredCmds = macroCommandsData.filter(cmd => {
    const matchesCategory = encCategory === 'all' || cmd.category === encCategory;
    const rawQuery = encSearch.toLowerCase().trim();
    if (!rawQuery) return matchesCategory;

    const normQuery = rawQuery.startsWith('/') ? rawQuery.slice(1) : rawQuery;

    const searchableText = [
      cmd.command,
      cmd.alias,
      cmd.name,
      cmd.syntax,
      cmd.description,
      cmd.tips || '',
      ...(cmd.examples || [])
    ].join(' ').toLowerCase();

    const matchesQuery = searchableText.includes(rawQuery) || searchableText.includes(normQuery);
    return matchesCategory && matchesQuery;
  });

  const activeCmd = macroCommandsData.find(c => c.id === selectedCmdId) || filteredCmds[0] || macroCommandsData[0];

  return (
    <div className="h-screen bg-[#0a0a0f] text-[#e2e2e2] font-sans flex flex-col overflow-hidden selection:bg-[#3b82f6]/30">
      
      {/* Navigation Header */}
      <header className="h-14 bg-[#161625] border-b border-[#c5a059]/30 flex items-center justify-between px-6 shadow-2xl shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-gradient-to-br from-[#c5a059] to-[#8a6d3b] rounded-sm flex items-center justify-center shadow-[0_0_10px_rgba(197,160,89,0.3)]">
            <svg viewBox="0 0 100 100" className="w-4 h-4">
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

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-[#0a0a0f] p-1 rounded-lg border border-[#3b82f6]/20">
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[14px] font-bold transition-all ${
              activeTab === 'builder'
                ? 'bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-slate-200 shadow-md'
                : 'text-gray-400 hover:text-slate-200 hover:bg-[#1a1a2e]'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>巨集組裝器</span>
          </button>

          <button
            onClick={() => setActiveTab('encyclopedia')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[14px] font-bold transition-all ${
              activeTab === 'encyclopedia'
                ? 'bg-gradient-to-r from-[#c5a059] to-[#9a7b3c] text-slate-200 shadow-md'
                : 'text-gray-400 hover:text-slate-200 hover:bg-[#1a1a2e]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>巨集指令百科</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>FFXIV 7.0 Dawntrail 繁中指令庫</span>
        </div>
      </header>

      {/* Main Mode View */}
      {activeTab === 'builder' ? (
        <>
          {/* Action Rules and Settings Bar (Fixed 2-Row Dedicated Layout - Zero Wrapping & Zero Shifting) */}
          <div className="bg-[#0f0f1a] border-b border-[#1f1f35] p-3 flex flex-col gap-2 shrink-0 relative z-20 text-[14px]">
            
            {/* Row 1: Global Job Selector, Cast Mode & Output Options */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141424] px-3 py-2 rounded-lg border border-[#252542] shadow-sm">
              
              {/* Left Group: Job & Mode */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* 1. Job Dropdown */}
                <div className="flex items-center gap-2 relative shrink-0" ref={jobDropdownRef}>
                  <div className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-wider text-xs">
                    <Shield className="w-4 h-4 text-[#c5a059]" />
                    <span>職業:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsJobDropdownOpen(!isJobDropdownOpen)}
                    className="flex items-center justify-between gap-2 px-3 py-1 bg-[#0a0a0f] border border-[#22d3ee]/60 text-[#22d3ee] rounded-md text-[14px] font-bold transition-all focus:outline-none hover:bg-[#22d3ee]/10 w-[140px] shadow-sm"
                  >
                    <span className="truncate">{jobSkillsData[selectedJob as keyof typeof jobSkillsData]?.name.replace(/（[^）]+）/g, '') || selectedJob}</span>
                    {isJobDropdownOpen ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
                  </button>

                  {/* Dropdown Options List */}
                  {isJobDropdownOpen && (
                    <div className="absolute top-[calc(100%+6px)] left-0 w-[210px] max-h-[320px] overflow-y-auto bg-[#0d0d18] border border-[#22d3ee]/40 rounded-lg shadow-2xl z-50 py-1.5 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                      {JOB_GROUPS.map((group) => (
                        <div key={group.name} className="mb-2 last:mb-0">
                          <div className="px-3 py-1 text-xs font-bold text-[#3b82f6] uppercase tracking-wider select-none bg-[#121220]/80">
                            {group.name}
                          </div>
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
                                  className={`px-4 py-1.5 text-left text-[14px] font-medium transition-colors w-full ${
                                    isSelected
                                      ? 'bg-[#3b82f6]/20 text-slate-200 font-bold border-l-2 border-[#3b82f6]'
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

                <div className="w-px h-5 bg-[#272745] hidden md:block"></div>

                {/* 2. Category Selector (Segmented Control) */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">模式:</span>
                  <div className="flex bg-[#0a0a0f] rounded-lg border border-[#252542] p-1">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.id as Category)}
                        className={`text-[13px] px-3 py-0.5 rounded-md transition-all font-bold ${
                          config.category === cat.id 
                            ? 'bg-gradient-to-r from-[#252545] to-[#303058] text-[#3b82f6] shadow-sm border border-[#3b82f6]/30' 
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Group: Format Options */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Option 1: Show Icon */}
                <button 
                  onClick={() => setConfig({...config, useMicon: !config.useMicon})}
                  className="flex items-center gap-2 px-2.5 py-1 bg-[#0a0a0f] hover:bg-[#1a1a2e] border border-[#252542] rounded-md transition-all group shrink-0"
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors border ${config.useMicon ? 'bg-[#3b82f6] border-[#3b82f6]' : 'bg-[#1a1a2e] border-gray-600'}`}>
                    {config.useMicon && <Check className="w-3 h-3 text-slate-200" />}
                  </div>
                  <span className="text-gray-300 text-xs font-bold group-hover:text-slate-200 transition-colors">`/micon` 圖案</span>
                </button>

                {/* Option 2: Send Chat */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => setConfig({...config, useChat: !config.useChat})}
                    className="flex items-center gap-2 px-2.5 py-1 bg-[#0a0a0f] hover:bg-[#1a1a2e] border border-[#252542] rounded-md transition-all group shrink-0"
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors border ${config.useChat ? 'bg-[#3b82f6] border-[#3b82f6]' : 'bg-[#1a1a2e] border-gray-600'}`}>
                      {config.useChat && <Check className="w-3 h-3 text-slate-200" />}
                    </div>
                    <span className="text-gray-300 text-xs font-bold group-hover:text-slate-200 transition-colors">對話框通知</span>
                  </button>

                  {config.useChat && (
                    <div className="flex items-center gap-1.5 bg-[#0a0a0f] border border-[#3b82f6]/40 rounded-md p-1 animate-in fade-in duration-150">
                      <select 
                        value={config.chatChannel}
                        onChange={e => setConfig({...config, chatChannel: e.target.value})}
                        className="bg-[#1a1a2e] border border-[#3b82f6]/30 rounded px-1.5 py-0.5 text-xs text-[#22d3ee] font-mono font-bold focus:outline-none focus:border-[#3b82f6] shrink-0 cursor-pointer"
                      >
                        <option value="/a">團隊 (/a)</option>
                        <option value="/p">隊伍 (/p)</option>
                        <option value="/echo">默語 (/e)</option>
                        <option value="/s">一般 (/s)</option>
                        <option value="">自訂</option>
                      </select>
                      <input 
                        type="text"
                        value={config.chatMessage}
                        onChange={e => setConfig({...config, chatMessage: e.target.value})}
                        placeholder="訊息..."
                        className="w-36 lg:w-48 bg-[#07070c] border border-[#3b82f6]/30 rounded px-2 py-0.5 text-xs text-[#e2e2e2] focus:outline-none focus:border-[#c5a059]"
                      />
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Row 2: Dedicated Targeting Bar (Zero Height Shift & Zero Wrapping) */}
            <div className="flex items-center gap-3 bg-[#141424] px-3 py-2 rounded-lg border border-[#252542] shadow-sm min-h-[44px]">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider shrink-0 select-none">目標選擇:</span>
              
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {TEMPLATES[config.category].map(tpl => {
                  const isSelected = config.template === tpl.id;
                  const isParty = tpl.id === 'party';

                  return (
                    <div key={tpl.id} className="flex items-center gap-1.5">
                      <button
                        onClick={() => setConfig({...config, template: tpl.id})}
                        className={`text-[13px] py-1 px-3 rounded-md border transition-all font-bold flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-slate-200 shadow-sm'
                            : 'bg-[#0a0a0f] border-[#252542] text-gray-400 hover:bg-[#1a1a2e] hover:text-gray-200'
                        }`}
                      >
                        <span>{isParty ? `隊伍成員 (<${config.partyNumber || 2}>)` : tpl.name}</span>
                      </button>

                      {/* Integrated Inline Number Chips for Party Members */}
                      {isParty && (
                        <div className="flex items-center gap-1 bg-[#0a0a0f] border border-[#3b82f6]/30 p-1 rounded-md">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
                            const isNumActive = isSelected && (config.partyNumber || 2) === num;
                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => {
                                  setConfig(prev => ({
                                    ...prev,
                                    template: 'party',
                                    partyNumber: num
                                  }));
                                }}
                                className={`w-5 h-5 rounded text-xs font-bold transition-all flex items-center justify-center ${
                                  isNumActive
                                    ? 'bg-[#3b82f6] text-slate-200 shadow-sm'
                                    : 'text-gray-400 hover:bg-[#1a1a2e] hover:text-slate-200'
                                }`}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none border-[1px] border-[#3b82f6]/5 m-2 z-0"></div>
            
            {/* Left Column (Skill Library) */}
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
                      className="px-4 py-2 bg-[#252545] hover:bg-[#3b82f6]/30 border border-[#3b82f6]/50 rounded text-[15px] text-slate-200 transition-colors font-bold shrink-0 flex items-center justify-center"
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
                  
                  <div className="text-[14px] text-gray-500 font-medium">
                    點擊技能圖示即可快速插入巨集語法
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
                      <div className="w-full h-full rounded flex flex-col items-center justify-center p-1 transition-colors bg-[#252545] text-gray-300 group-hover:text-slate-200">
                        {skill.icon && <img src={skill.icon} alt={skill.name} className="w-6 h-6 mb-1 rounded shadow-sm" />}
                        <span className="text-[14px] text-center leading-tight line-clamp-2 w-full">{skill.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Right Panel: Split into Editor and Tools */}
            <section className="flex-1 bg-[#07070c] p-4 lg:p-6 flex flex-col md:flex-row gap-6 relative z-10 overflow-hidden h-full">
              
              {/* Left Part: Macro Editor */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="flex items-center gap-1.5 relative">
                      <h2 className="text-[#c5a059] text-[15px] font-bold uppercase tracking-tighter">Macro Editor (巨集編輯器)</h2>
                      <div className="relative group">
                        <button
                          type="button"
                          className="text-gray-400 hover:text-[#c5a059] transition-colors p-0.5 rounded-full flex items-center justify-center"
                          title="說明提示"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                        <div className="absolute top-full left-0 mt-2 w-72 p-3 bg-[#121220] border border-[#3b82f6]/40 rounded-lg text-xs text-gray-200 shadow-2xl z-50 hidden group-hover:block pointer-events-none leading-relaxed animate-in fade-in duration-150 backdrop-blur-md">
                          💡 您可以點擊左側技能或上方快捷組件自動點擊生成，也可以切換上方『巨集指令百科』查看完整繁中說明！
                        </div>
                      </div>
                    </div>
                    <p className={`text-[14px] ${macroText.split('\n').length > 15 ? 'text-red-400 font-bold animate-pulse' : 'text-gray-500'}`}>
                      {macroText ? macroText.split('\n').length : 0} / 15 行數上限
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsTimelineModalOpen(true)}
                      className="px-3 py-1 bg-[#1a1a2e] text-[14px] border border-[#3b82f6]/50 text-[#3b82f6] hover:bg-[#3b82f6]/20 rounded transition-colors font-bold flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
                      時間軸轉巨集
                    </button>
                    <button
                      onClick={handleClear}
                      className="px-3 py-1 bg-[#1a1a2e] text-[14px] border border-red-900/50 text-red-400 hover:bg-red-900/20 rounded transition-colors font-bold flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      清除
                    </button>
                    <button
                      onClick={handleCopy}
                      className={`px-3 py-1 rounded text-slate-200 font-bold text-[14px] transition-all flex items-center gap-1.5 ${
                        copied 
                          ? 'bg-green-600 shadow-[0_2px_8px_rgba(22,163,74,0.3)]' 
                          : 'bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] shadow-[0_2px_8px_rgba(59,130,246,0.3)] active:translate-y-0.5'
                      }`}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      複製巨集
                    </button>
                  </div>
                </div>

                {/* Quick Syntax Insertion Buttons */}
                <div className="bg-[#121220] p-2 rounded-t-lg border-t border-x border-[#3b82f6]/20 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-gray-400 font-bold px-1 select-none">快速插入:</span>
                  {['/merror off', '<gtoff>', '<mo>', '<t>', '<me>', '<f>', '<tt>', '/p', '/e', '<se.1>'].map(token => (
                    <button
                      key={token}
                      onClick={() => insertText(token)}
                      className="px-2 py-0.5 bg-[#1a1a2e] hover:bg-[#3b82f6]/30 border border-[#3b82f6]/30 text-[#22d3ee] rounded font-mono font-bold transition-all hover:scale-105"
                    >
                      {token}
                    </button>
                  ))}
                </div>

                {/* Code Box container */}
                <div className="flex-1 bg-[#0a0a14] border border-[#3b82f6]/20 rounded-b-lg flex overflow-hidden shadow-inner min-h-[300px]">
                  {/* Line Numbers Gutter */}
                  <div className="w-10 bg-[#0d0d1d] border-r border-[#1a1a2e] flex flex-col items-center pt-4 text-gray-600 select-none text-[14px] font-mono shrink-0">
                    {Array.from({ length: Math.max(15, macroText.split('\n').length) }).map((_, i) => (
                      <div key={i} className={`h-[22px] leading-[22px] ${i >= 15 ? 'text-red-500 font-bold' : ''}`}>{i + 1}</div>
                    ))}
                  </div>

                  {/* Textarea */}
                  <textarea
                    ref={textAreaRef}
                    value={macroText}
                    onChange={(e) => setMacroText(e.target.value)}
                    placeholder="在此編輯您的巨集..."
                    className="flex-1 w-full bg-transparent text-[#e2e2e2] p-4 resize-none focus:outline-none focus:ring-0 font-mono text-[15px] leading-[22px] whitespace-pre overflow-auto placeholder:text-gray-600 custom-scrollbar"
                    spellCheck="false"
                  />
                </div>
              </div>

              {/* Right Part: WAIT Tools & Quick References */}
              <div className="flex-1 flex flex-col h-full bg-[#121220] border border-[#c5a059]/20 rounded-lg p-5 justify-start overflow-y-auto custom-scrollbar">
                <div className="space-y-5">
                  
                  {/* Wait Insertion tool / Advance Alert setting */}
                  <div>
                    <h3 className="text-[#c5a059] text-[15px] font-bold uppercase tracking-wider mb-2.5">
                      插入延遲指令/提醒巨集提早秒數
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 bg-[#1a1a2e] p-2.5 rounded border border-[#3b82f6]/20 shadow-inner w-max">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-gray-400 uppercase tracking-wider">提早提醒</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="60"
                          value={advanceSec}
                          onChange={e => setAdvanceSec(Number(e.target.value))}
                          className="w-12 bg-[#0a0a0f] border border-[#3b82f6]/20 rounded px-1.5 py-0.5 text-center text-[15px] text-[#e2e2e2] font-mono focus:outline-none"
                        />
                        <span className="text-[14px] text-gray-500">秒</span>
                      </div>

                      <div className="h-5 w-[1px] bg-[#3b82f6]/20 hidden sm:block"></div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400 ml-1" />
                        <span className="text-[14px] font-bold text-gray-400 uppercase tracking-wider">延遲</span>
                        <input 
                          type="number" 
                          min="1" 
                          max="60"
                          value={waitSec}
                          onChange={e => setWaitSec(Number(e.target.value))}
                          className="w-12 bg-[#0a0a0f] border border-[#3b82f6]/20 rounded px-1.5 py-0.5 text-center text-[15px] text-[#e2e2e2] font-mono focus:outline-none"
                        />
                        <span className="text-[14px] text-gray-500 mr-2">秒</span>
                      </div>

                      <button 
                        onClick={appendWait}
                        className="px-3 py-1 rounded text-slate-200 font-bold text-[14px] transition-all flex items-center justify-center gap-1.5 bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] shadow-[0_2px_8px_rgba(59,130,246,0.3)] active:translate-y-0.5"
                        title="插入延遲到最後一行"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>加入 Wait</span>
                      </button>
                    </div>
                  </div>

                  {/* FFXIV Macro Quick Guides & Reference */}
                  <div className="border-t border-[#1a1a2e] pt-4">
                    <h3 className="text-[#c5a059] text-[15px] font-bold uppercase tracking-wider mb-3">經典戰鬥巨集範本</h3>
                    <div className="space-y-3">
                      
                      <div className="p-3 bg-[#0a0a0f] border border-[#3b82f6]/10 rounded hover:border-[#3b82f6]/40 transition-colors">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-200 font-bold text-[14px]">瞬發復活巨集</span>
                          <button
                            onClick={() => insertText('/micon "即刻詠唱"\n/merror off\n/ac "即刻詠唱" <me> <wait.1>\n/ac "復活" <t>\n/ac "復活" <2>', true)}
                            className="text-xs px-2 py-0.5 bg-[#3b82f6]/20 text-[#3b82f6] hover:bg-[#3b82f6] hover:text-slate-200 rounded font-bold transition-all"
                          >
                            + 插入此巨集
                          </button>
                        </div>
                        <code className="text-xs text-[#22d3ee] block font-mono whitespace-pre bg-[#07070c] p-2 rounded leading-relaxed">
                          {"/micon \"即刻詠唱\"\n/merror off\n/ac \"即刻詠唱\" <me> <wait.1>\n/ac \"復活\" <t>\n/ac \"復活\" <2>"}
                        </code>
                      </div>
                      
                      <div className="p-3 bg-[#0a0a0f] border border-[#3b82f6]/10 rounded hover:border-[#3b82f6]/40 transition-colors">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-200 font-bold text-[14px]">地面指定技能 (快速施放)</span>
                          <button
                            onClick={() => insertText('/micon "地星"\n/merror off\n/ac "地星" <gtoff>\n/ac "地星" <t>', true)}
                            className="text-xs px-2 py-0.5 bg-[#3b82f6]/20 text-[#3b82f6] hover:bg-[#3b82f6] hover:text-slate-200 rounded font-bold transition-all"
                          >
                            + 插入此巨集
                          </button>
                        </div>
                        <code className="text-xs text-[#22d3ee] block font-mono whitespace-pre bg-[#07070c] p-2 rounded leading-relaxed">
                          {"/micon \"地星\"\n/merror off\n/ac \"地星\" <gtoff>\n/ac \"地星\" <t>"}
                        </code>
                      </div>

                      <div className="p-3 bg-[#0a0a0f] border border-[#3b82f6]/10 rounded hover:border-[#3b82f6]/40 transition-colors">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-200 font-bold text-[14px]">坦克退避焦點/副坦</span>
                          <button
                            onClick={() => insertText('/micon "退避"\n/merror off\n/ac "退避" <f>\n/ac "退避" <2>', true)}
                            className="text-xs px-2 py-0.5 bg-[#3b82f6]/20 text-[#3b82f6] hover:bg-[#3b82f6] hover:text-slate-200 rounded font-bold transition-all"
                          >
                            + 插入此巨集
                          </button>
                        </div>
                        <code className="text-xs text-[#22d3ee] block font-mono whitespace-pre bg-[#07070c] p-2 rounded leading-relaxed">
                          {"/micon \"退避\"\n/merror off\n/ac \"退避\" <f>\n/ac \"退避\" <2>"}
                        </code>
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
                    <div className="text-[15px] font-bold text-slate-200 leading-tight">{hoveredSkill.name}</div>
                    {hoveredSkill.classification && (
                      <span className="w-max px-1.5 py-0.5 text-[12px] font-bold bg-[#c5a059] text-[#0a0a0f] rounded mt-1">
                        {hoveredSkill.classification}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-gray-700/50 my-2.5"></div>
                
                <div className="grid grid-cols-2 gap-y-1 text-[13px] text-gray-400 font-medium">
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
                
                <div className="text-[13px] text-gray-300 leading-normal whitespace-pre-wrap font-sans">
                  {hoveredSkill.description || '暫無說明'}
                </div>
              </div>
            )}
          </main>
        </>
      ) : (
        /* Macro Encyclopedia Mode View */
        <main className="flex-1 bg-[#0a0a12] flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Command Categories & Command List */}
          <aside className="w-full md:w-[380px] bg-[#0d0d18] border-r border-[#1a1a2e] flex flex-col shrink-0 overflow-hidden h-full">
            
            {/* Search Box */}
            <div className="p-4 border-b border-[#1a1a2e] bg-[#121220]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={encSearch}
                  onChange={(e) => setEncSearch(e.target.value)}
                  placeholder="搜尋巨集指令 (如 /ac, <mo>, wait)..."
                  className="w-full bg-[#07070c] border border-[#3b82f6]/30 rounded pl-9 pr-3 py-2 text-[14px] text-slate-200 focus:outline-none focus:border-[#c5a059]"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="p-3 border-b border-[#1a1a2e] flex flex-wrap gap-1.5 bg-[#0a0a0f]">
              {ENCYCLOPEDIA_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setEncCategory(cat.id)}
                  className={`text-xs px-2.5 py-1 rounded font-bold transition-all ${
                    encCategory === cat.id
                      ? 'bg-[#c5a059] text-[#0a0a0f] shadow-md'
                      : 'bg-[#1a1a2e] text-gray-400 hover:text-slate-200 hover:bg-[#252545]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Command List Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {filteredCmds.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">沒有找到符合條件的巨集指令</div>
              ) : (
                filteredCmds.map(cmd => {
                  const isSelected = activeCmd.id === cmd.id;
                  return (
                    <div
                      key={cmd.id}
                      onClick={() => setSelectedCmdId(cmd.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#1e1e38] border-[#c5a059] shadow-lg'
                          : 'bg-[#121220] border-[#1a1a2e] hover:border-[#3b82f6]/40 hover:bg-[#16162a]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-mono font-bold text-[#22d3ee] text-[15px]">{cmd.command}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-[#1a1a2e] text-gray-400 border border-gray-700/50">
                          {cmd.categoryName}
                        </span>
                      </div>
                      <div className="text-[14px] font-bold text-gray-200 mb-1">{cmd.name}</div>
                      <p className="text-[12px] text-gray-400 line-clamp-2 leading-relaxed">
                        {cmd.description}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Column: Command Detail Encyclopedia View */}
          <section className="flex-1 bg-[#07070c] p-6 lg:p-8 overflow-y-auto custom-scrollbar flex flex-col justify-between">
            <div>
              {/* Detail Header */}
              <div className="border-b border-[#1a1a2e] pb-6 mb-6">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-2xl lg:text-3xl font-mono font-bold text-[#22d3ee]">{activeCmd.command}</h2>
                  {activeCmd.alias && (
                    <span className="text-sm font-mono text-gray-400 bg-[#121220] px-2.5 py-1 rounded border border-[#1a1a2e]">
                      簡寫 / 別名: {activeCmd.alias}
                    </span>
                  )}
                  <span className="text-xs px-3 py-1 bg-[#c5a059]/20 text-[#c5a059] font-bold rounded-full border border-[#c5a059]/30">
                    {activeCmd.categoryName}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-200 mt-2">{activeCmd.name}</h3>
              </div>

              {/* Syntax & Usage */}
              <div className="space-y-6">
                
                {/* Syntax Box */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#c5a059] mb-2 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4" />
                    <span>語法格式 (Syntax)</span>
                  </h4>
                  <div className="bg-[#0f0f1c] border border-[#3b82f6]/30 p-3.5 rounded-lg font-mono text-[15px] text-[#22d3ee] shadow-inner select-all">
                    {activeCmd.syntax}
                  </div>
                </div>

                {/* Detailed Description */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#c5a059] mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>繁體中文詳細說明</span>
                  </h4>
                  <p className="text-[15px] text-gray-300 leading-relaxed bg-[#121220] p-4 rounded-lg border border-[#1a1a2e]">
                    {activeCmd.description}
                  </p>
                </div>

                {/* Examples */}
                {activeCmd.examples && activeCmd.examples.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#c5a059] mb-2 flex items-center gap-1.5">
                      <Play className="w-4 h-4" />
                      <span>實戰範例 (Examples)</span>
                    </h4>
                    <div className="bg-[#0f0f1c] border border-[#1a1a2e] p-4 rounded-lg space-y-2">
                      {activeCmd.examples.map((ex, idx) => (
                        <div key={idx} className="flex justify-between items-center group">
                          <code className="font-mono text-[14px] text-[#22d3ee]">{ex}</code>
                          <button
                            onClick={() => insertText(ex)}
                            className="text-xs px-2.5 py-1 bg-[#3b82f6]/20 text-[#3b82f6] hover:bg-[#3b82f6] hover:text-slate-200 rounded font-bold transition-all"
                          >
                            + 插入到編輯區
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Important Tips */}
                {activeCmd.tips && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#c5a059] mb-2 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" />
                      <span>注意事項與提示 (Tips)</span>
                    </h4>
                    <div className="bg-[#1a1625] border border-[#c5a059]/30 p-4 rounded-lg text-[14px] text-amber-200/90 leading-relaxed">
                      💡 {activeCmd.tips}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Direct Insert Action Bar */}
            <div className="border-t border-[#1a1a2e] pt-6 mt-8 flex justify-between items-center">
              <div className="text-xs text-gray-500 font-medium">
                點擊右側按鈕可將此指令語法插入到巨集編輯器中。
              </div>
              <button
                onClick={() => {
                  insertText(activeCmd.command);
                  setActiveTab('builder');
                }}
                className="px-5 py-2 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-blue-500 hover:to-blue-700 text-slate-200 rounded-lg font-bold text-[14px] shadow-lg flex items-center gap-2 transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                <span>插入 `{activeCmd.command}` 到編輯器</span>
              </button>
            </div>

          </section>
        </main>
      )}

      {/* Timeline Converter Modal */}
      {isTimelineModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#121220] border border-[#3b82f6]/40 rounded-xl p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 border-b border-[#1a1a2e] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#c5a059]" />
                <h3 className="text-lg font-bold text-slate-200">時間軸轉巨集</h3>
              </div>
              <button 
                onClick={() => setIsTimelineModalOpen(false)}
                className="text-gray-400 hover:text-slate-200 transition-colors text-xl font-bold font-mono"
              >
                &times;
              </button>
            </div>
            
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              <p className="text-[14px] text-gray-300">
                請貼入 FFXIV 排軸文字（只會辨識包含時間格式 <code className="text-[#22d3ee] font-mono">分:秒</code> 或 <code className="text-[#22d3ee] font-mono">分:秒.毫秒</code> 的行）：
              </p>
              
              <textarea
                value={timelineText}
                onChange={(e) => setTimelineText(e.target.value)}
                placeholder="例如：&#10;=== FFXIV 排軸文字檔 ===&#10;3:12.000  (命運之輪)&#10;4:00.000  (太陽星座)&#10;4:24.000  (太陽星座)"
                className="flex-1 w-full bg-[#0a0a0f] border border-[#3b82f6]/20 rounded-lg p-4 font-mono text-[14px] text-[#e2e2e2] resize-none focus:outline-none focus:border-[#3b82f6]/60 placeholder:text-gray-600 custom-scrollbar min-h-[200px]"
              />

              <div className="bg-[#1a1625] p-3 rounded-lg border border-[#c5a059]/30 text-xs text-amber-200/90 leading-relaxed">
                💡 <b>溫馨提示</b>：轉換時會根據右上角設定的「提早提醒秒數」（目前為 <span className="underline font-bold font-mono text-slate-200">{advanceSec}秒</span>）進行時間偏移對齊。超過 60 秒的等待區間將自動以 60 秒為單位進行分割，並產生 <code className="text-slate-200">x秒後開減傷</code> 的剩餘秒數提醒。
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5 pt-3 border-t border-[#1a1a2e]">
              <button
                type="button"
                onClick={() => setIsTimelineModalOpen(false)}
                className="px-4 py-2 bg-[#1a1a2e] border border-gray-700 text-gray-300 hover:bg-[#252545] rounded-lg transition-colors font-bold text-[14px]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConvertTimeline}
                className="px-5 py-2 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-blue-500 hover:to-blue-700 text-slate-200 rounded-lg font-bold text-[14px] shadow-lg transition-all hover:scale-105"
              >
                開始轉換
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
