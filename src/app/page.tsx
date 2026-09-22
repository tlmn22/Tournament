import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, GitBranch, Layers3, Trophy, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroVisual } from "@/components/hero-visual";
import { FeatureDemo } from "@/components/feature-demo";
import { SportIcon, type Sport } from "@/components/sport-icon";

const sports: { id: Sport; label: string }[] = [
  { id: "basketball", label: "Сагсан бөмбөг" },
  { id: "volleyball", label: "Волейбол" },
  { id: "football", label: "Хөлбөмбөг" },
  { id: "esports", label: "Esports" },
  { id: "other", label: "Бусад спорт" },
];

const steps = [
  { number: "01", icon: Trophy, title: "Тэмцээнээ үүсгэ", description: "Нэр, спортын төрөл, ангилал болон тэмцээний форматаа сонгоно." },
  { number: "02", icon: UsersRound, title: "Багуудаа нэгтгэ", description: "Оролцогч баг, тамирчдын бүрэлдэхүүнээ оруулж, хэсэг болон хуваариа гаргана." },
  { number: "03", icon: GitBranch, title: "Тоглолтоо удирд", description: "Үр дүнгээ бүртгэж, тэмцээний явцыг багууд болон үзэгчидтэйгээ хуваалцана." },
];

const faqs = [
  { question: "Ямар тэмцээн зохион байгуулахад зориулагдсан бэ?", answer: "Байгууллагын спортын наадам, найзуудын жижиг тэмцээн, сонирхогчдын лиг болон esports тэмцээнд зориулж хөгжүүлж байна. Эхний хувилбар сагсан бөмбөгийн тэмцээнд төвлөрнө." },
  { question: "Нэг компани хэд хэдэн баг оролцуулж болох уу?", answer: "Болно. Нэг компани нэг спортын ангилалд хэд хэдэн багтай оролцох боломжийг төлөвлөсөн. Баг бүр өөрийн бүрэлдэхүүн, тоглолт, үр дүнтэй байна." },
  { question: "Компанийн нийлбэр дүн заавал тооцох уу?", answer: "Заавал биш. Тэмцээнд шаардлагатай бол менежер спортын төрлүүдийн үр дүнг харж, компанийн үнэлгээ болон нэгдсэн байрыг гараар оруулна." },
  { question: "Tournament одоо ямар шатанд явж байгаа вэ?", answer: "Танилцуулгын эхний хувилбар бэлэн болж байна. Дараагийн алхам нь хэрэглэгчийн бүртгэл, нэвтрэлт болон сагсан бөмбөгийн тэмцээний удирдлага юм." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow"><span className="tiny-dot" /> ХАМТ ОЛНЫГ НЭГТГЭХ ТАЛБАР</div>
              <h1 id="hero-title">Тэмцээн бүрийг<br /><span className="hero-highlight">хамтдаа</span>{" "}<br />бүтээе<span className="heading-dot">.</span></h1>
              <p className="hero-description">Багийн анхны бүртгэлээс аваргын сүүлийн шүгэл хүртэл.<br className="desktop-break" /> Тэмцээний бүх зохион байгуулалт — нэг талбарт.</p>
              <div className="hero-actions"><Link href="/register" className="button button-lime">Эхлүүлэх <ArrowUpRight size={19} /></Link><Link href="/tournaments" className="button button-outline">Тэмцээнүүд үзэх <ArrowRight size={18} /></Link></div>
              <div className="hero-note"><span className="note-icon"><UsersRound size={17} /></span><p>Байгууллагын наадмаас найзуудын лиг хүртэл.<br /><strong>Тэмцээн бүрд өөрийн гэсэн талбар.</strong></p></div>
            </div>
            <HeroVisual />
          </div>
          <div className="container hero-bottom"><span>ЗОХИОН БАЙГУУЛАЛТ ХЯЛБАР. ӨРСӨЛДӨӨН СОНИРХОЛТОЙ.</span><a href="#features" aria-label="Боломжуудтай танилцах"><ArrowDown size={18} /></a></div>
        </section>

        <section className="sports-strip" aria-label="Спортын төрлүүд">
          <div className="container sports-inner"><span className="sports-intro">Олон спорт.<br /><strong>Нэг систем.</strong></span><div className="sports-list">{sports.map((sport) => <div className="sport-item" key={sport.id}><SportIcon sport={sport.id} size={26} /><span>{sport.label}</span></div>)}</div></div>
        </section>

        <section className="section features-section" id="features" aria-labelledby="features-title">
          <div className="container">
            <div className="section-heading"><div><span className="section-kicker">БАГА АЖИЛ. ИХ ДОГДЛОЛ.</span><h2 id="features-title">Зохион байгуулалтаа<br />нэг дор төвлөрүүл.</h2></div><p>Олон чат, салангид хүснэгтийн оронд<br />баг, хуваарь, үр дүнгээ нэг газраас.</p></div>
            <div className="features-layout">
              <div className="feature-copy-list">
                <article className="feature-copy"><span className="feature-icon"><UsersRound size={21} /></span><div><h3>Баг бүр өөрийн орон зайтай</h3><p>Компани, баг, тамирчдын бүрэлдэхүүн. Хэн, аль багт оролцож байгааг тодорхой харна.</p></div></article>
                <article className="feature-copy"><span className="feature-icon"><CalendarDays size={21} /></span><div><h3>Хуваарь ойлгомжтой, мэдээлэл нэг</h3><p>Тоглолтын цаг, талбай, өрсөлдөгч. Багууд болон үзэгчдэд хэрэгтэй мэдээлэл нэг дор.</p></div></article>
                <article className="feature-copy"><span className="feature-icon"><GitBranch size={21} /></span><div><h3>Эхний тоглолтоос эцсийн байр хүртэл</h3><p>Хэсгийн шат, хасагдах тоглолт, үр дүн. Тэмцээний явцыг бүхэлд нь харах боломж.</p></div></article>
                <a href="#how-it-works" className="text-link">Яаж эхлэх вэ? <ArrowUpRight size={17} /></a>
              </div>
              <FeatureDemo />
            </div>
          </div>
        </section>

        <section className="community-section" aria-labelledby="community-title">
          <div className="container community-grid">
            <div className="community-art" aria-hidden="true"><div className="community-ring ring-outer" /><div className="community-ring ring-inner" /><div className="community-center"><Trophy size={47} strokeWidth={1.5} /></div><span className="community-token token-one">А</span><span className="community-token token-two">Б</span><span className="community-token token-three">В</span><span className="community-token token-four"><SportIcon sport="basketball" size={30} /></span><span className="community-token token-five"><SportIcon sport="esports" size={30} /></span><span className="community-label label-one">Өөр өөр баг.</span><span className="community-label label-two">Нэг хамт олон.</span><span className="community-plus">+</span></div>
            <div className="community-copy"><span className="section-kicker">ХАМТЫН ЯЛАЛТ ЭНДЭЭС ЭХЭЛНЭ</span><h2 id="community-title">Өрсөлдөөнөөс илүү.<br />Хамт олны холбоо.</h2><p>Нэг компаниас олон баг. Нэг наадамд олон спорт.<br />Хэлтэс, компани, найзуудаа нэг зорилгын дор нэгтгэхэд зориулсан талбар.</p><ul><li><Check size={16} /> Олон спорттой байгууллагын наадам</li><li><Check size={16} /> Компани бүрээс олон багийн оролцоо</li><li><Check size={16} /> Менежерийн удирдах нэгдсэн дүн</li></ul><Link className="text-link" href="/tournaments">Тэмцээнүүдтэй танилцах <ArrowUpRight size={18} /></Link></div>
          </div>
        </section>

        <section className="section how-section" id="how-it-works" aria-labelledby="how-title"><div className="container"><div className="section-heading centered"><span className="section-kicker">ЭХЛЭХЭД ОЙРХОН</span><h2 id="how-title">Таны тэмцээн. Гурван алхам.</h2><p>Санаагаа талбай дээр гаргах замаа хамтдаа хялбарчилъя.</p></div><div className="steps-grid">{steps.map((step) => <article className="step" key={step.number}><div className="step-top"><span>{step.number}</span><step.icon size={24} strokeWidth={1.6} /></div><h3>{step.title}</h3><p>{step.description}</p></article>)}</div></div></section>

        <section className="faq-section" aria-labelledby="faq-title"><div className="container faq-grid"><div><span className="section-kicker">МЭДЭХЭД ИЛҮҮДЭХГҮЙ</span><h2 id="faq-title">Түгээмэл<br />асуултууд.</h2><p>Эхлэхийн өмнө хэрэгтэй<br />хэдэн хариулт.</p></div><div className="faq-list">{faqs.map((faq) => <details className="faq-item" key={faq.question}><summary>{faq.question}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div></div></section>

        <section className="cta-section"><div className="container"><div className="cta-panel"><div className="cta-decoration" aria-hidden="true"><Layers3 size={240} strokeWidth={0.5} /></div><div><span className="section-kicker">ДАРААГИЙН ГОЁ ДУРСАМЖ</span><h2>Таны тэмцээнээс<br />эхэлнэ.</h2><p>Багаа нэгтгэ. Талбараа бэлд. Түүхээ бүтээ.</p></div><Link className="button button-lime" href="/register">Хамтдаа эхлүүлэх <ArrowUpRight size={20} /></Link></div></div></section>
      </main>
      <SiteFooter />
    </>
  );
}
