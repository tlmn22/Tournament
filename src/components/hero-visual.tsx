import { ArrowUpRight, Check, Trophy } from "lucide-react";
import { SportIcon } from "./sport-icon";

export function HeroVisual() {
  return (
    <div className="hero-visual" aria-label="Тэмцээний хуудасны жишээ загвар. Доорх баг, оноо нь жишээ мэдээлэл.">
      <div className="orbit orbit-one" aria-hidden="true" />
      <div className="orbit orbit-two" aria-hidden="true" />
      <svg className="hero-spark" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true"><path d="M18 0v36M0 18h36M5.3 5.3l25.4 25.4M5.3 30.7 30.7 5.3" stroke="currentColor" strokeWidth="2.5" /></svg>
      <div className="tournament-preview">
        <div className="preview-topline"><span><span className="tiny-dot" /> ТЭМЦЭЭНИЙ ТАЛБАР</span><span>ЖИШЭЭ ЗАГВАР</span></div>
        <div className="preview-heading"><div><span className="preview-year">ХАМТ ОЛНЫ СПОРТЫН НААДАМ</span><h2>BODI GAMES<span>2026</span></h2></div><span className="preview-arrow" aria-hidden="true"><ArrowUpRight size={25} /></span></div>
        <div className="court-scene">
          <svg className="court-lines" viewBox="0 0 440 250" fill="none" aria-hidden="true">
            <g stroke="currentColor" strokeWidth="1.2">
              <rect x="25" y="20" width="390" height="210" rx="2" />
              <path d="M220 20v210" /><circle cx="220" cy="125" r="40" />
              <path d="M25 71h66v108H25M415 71h-66v108h66" />
              <path d="M25 39c150 0 150 172 0 172M415 39c-150 0-150 172 0 172" />
              <path d="M91 90a35 35 0 0 1 0 70M349 90a35 35 0 0 0 0 70" />
              <path d="M41 106v38M399 106v38" /><circle cx="49" cy="125" r="8" /><circle cx="391" cy="125" r="8" />
            </g>
          </svg>
          <div className="court-ball" aria-hidden="true"><SportIcon sport="basketball" size={90} /></div>
          <span className="court-tag"><SportIcon sport="basketball" size={15} /> Сагсан бөмбөг</span>
          <span className="court-number" aria-hidden="true">01 / 05</span>
        </div>
        <div className="preview-bottom"><span><span className="mini-avatar">А</span><span className="mini-avatar avatar-lime">Б</span><span className="mini-avatar avatar-gray">В</span><span className="preview-teams">Нэг хамт олон. Нэг зорилго.</span></span><Trophy size={17} /></div>
      </div>
      <div className="floating-score">
        <div className="score-top"><span>ХАГАС ШИГШЭЭ</span><span className="score-label">Жишээ</span></div>
        <div className="score-teams"><div><span className="team-emblem emblem-green">А</span><span>Баг А</span></div><strong>48 <span>:</span> 42</strong><div><span className="team-emblem emblem-orange">Б</span><span>Баг Б</span></div></div>
        <div className="score-bottom"><span /> Тоглолт бүр. Нэг дор.</div>
      </div>
      <div className="floating-check"><span><Check size={15} strokeWidth={3} /></span> Бүх зүйл төлөвлөгөөний дагуу</div>
      <div className="visual-caption"><span aria-hidden="true">✳</span> ТАЛБАЙ ДЭЭРХ МӨЧ БҮР ҮНЭ ЦЭНТЭЙ.</div>
    </div>
  );
}
