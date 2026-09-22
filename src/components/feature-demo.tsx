"use client";

import { useRef, useState } from "react";
import { CalendarDays, Check, GitBranch, UsersRound } from "lucide-react";

const tabs = [
  { id: "teams", label: "Баг, бүрэлдэхүүн", icon: UsersRound },
  { id: "schedule", label: "Тоглолтын хуваарь", icon: CalendarDays },
  { id: "bracket", label: "Тэмцээний шатлал", icon: GitBranch },
] as const;

export function FeatureDemo() {
  const [selected, setSelected] = useState<(typeof tabs)[number]["id"]>("teams");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div className="workspace-demo">
      <div className="workspace-top"><span><span className="workspace-logo">T</span> Bodi Games <span className="workspace-year">/ 2026</span></span><span className="demo-chip">Жишээ харагдац</span></div>
      <div className="workspace-tabs" role="tablist" aria-label="Системийн боломжуудын жишээ">
        {tabs.map((tab, index) => <button key={tab.id} ref={(element) => { tabRefs.current[index] = element; }} role="tab" id={`tab-${tab.id}`} aria-controls={`panel-${tab.id}`} aria-selected={selected === tab.id} tabIndex={selected === tab.id ? 0 : -1} onClick={() => setSelected(tab.id)} onKeyDown={(event) => {
          let next = index;
          if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
          else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = tabs.length - 1;
          else return;
          event.preventDefault();
          setSelected(tabs[next].id);
          tabRefs.current[next]?.focus();
        }}><tab.icon size={16} /><span>{tab.label}</span></button>)}
      </div>
      <div className="workspace-content" role="tabpanel" id={`panel-${selected}`} aria-labelledby={`tab-${selected}`} tabIndex={0}>
        {selected === "teams" && <>
          <div className="demo-section-title"><h3>Нэг зорилгын төлөө, нэг баг.</h3><span>3 баг</span></div>
          <div className="demo-table-heading"><span>БАГИЙН НЭР</span><span>БҮРЭЛДЭХҮҮН</span><span>ТӨЛӨВ</span></div>
          {[{ name: "Баг А", company: "Компани А", count: 12, color: "green" }, { name: "Баг Б", company: "Компани Б", count: 10, color: "orange" }, { name: "Баг В", company: "Компани А", count: 12, color: "purple" }].map((team) => <div className="demo-team-row" key={team.name}><div><span className={`team-emblem emblem-${team.color}`}>{team.name.slice(-1)}</span><span><strong>{team.name}</strong><small>{team.company}</small></span></div><span>{team.count} тамирчин</span><span className="confirmed"><Check size={12} /> Батлагдсан</span></div>)}
        </>}
        {selected === "schedule" && <>
          <div className="demo-section-title"><h3>Тоглолт бүр өөрийн цагтай.</h3><span>Сагсан бөмбөг</span></div>
          {[{ time: "10:00", teams: "Баг А — Баг Б", stage: "Хэсгийн шат", court: "Талбай 1" }, { time: "11:30", teams: "Баг В — Баг Г", stage: "Хэсгийн шат", court: "Талбай 1" }, { time: "14:00", teams: "Баг Д — Баг Е", stage: "Хэсгийн шат", court: "Талбай 2" }].map((match) => <div className="demo-match-row" key={match.time}><span className="match-time">{match.time}</span><span><strong>{match.teams}</strong><small>{match.stage}</small></span><span className="court-pill">{match.court}</span></div>)}
        </>}
        {selected === "bracket" && <>
          <div className="demo-section-title"><h3>Ялалт бүр дараагийн алхам.</h3><span>Хасагдах шат</span></div>
          <div className="mini-bracket"><div className="bracket-round"><span className="round-title">ХАГАС ШИГШЭЭ</span><div className="bracket-match"><span className="winner">Баг А <b>48</b></span><span>Баг Б <b>42</b></span></div><div className="bracket-match"><span>Баг В <b>36</b></span><span className="winner">Баг Г <b>52</b></span></div></div><div className="bracket-connector" aria-hidden="true" /><div className="bracket-round final-round"><span className="round-title">ШИГШЭЭ</span><div className="bracket-match"><span>Баг А <b>—</b></span><span>Баг Г <b>—</b></span></div></div></div>
        </>}
      </div>
      <div className="workspace-footnote"><span className="tiny-dot" /> Энд харагдаж буй баг, тоглолт нь танилцуулгын жишээ болно.</div>
    </div>
  );
}
