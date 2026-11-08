
import {readFile,writeFile} from "node:fs/promises";
const d=JSON.parse(await readFile("chess/woman/results-transcribed.json","utf8"));
const q=s=>"'"+s.replaceAll("'","''")+"'";
const approved=d.games.filter(g=>g.status!=="needs_confirmation");
let sql=await readFile("supabase/seeds/buuruljuutcup2026_chess_men.sql","utf8");
sql=sql.replace("men's chess.","women's chess.").replace("-- 18 final standings; 54 evidenced games. Round 2 is NOT fabricated.","-- 8 final standings; "+approved.length+" games. Unresolved results are not imported.").replaceAll("Шатар · Эрэгтэй","Шатар · Эмэгтэй");
sql=sql.replace("Эцсийн байр, оноог албан дүнгээс оруулсан. 2-р өргийн зураг дутуу: нийт 54 тоглолтын дэлгэрэнгүй байна. Тэмцээн болсон огноо баталгаажаагүй.",approved.length===28?"Эцсийн байр, оноог албан дүнгээс оруулсан. 7 өргийн 28 тоглолт. Тэмцээн болсон огноо баталгаажаагүй.":"Эцсийн байр, оноог албан дүнгээс оруулсан. 1-р өргийн Энхтуяа Б – Гончигсүрэн Б тоглолтын дүн зөрүүтэй тул баталгаажуулах хүртэл оруулаагүй. Бусад 27 тоглолт бүртгэлтэй.");
sql=sql.replace(/for r in select \* from \(values\n[\s\S]*?\n \) as v\(name,organization,place,points\)/,"for r in select * from (values\n"+d.standings.map(s=>"("+[q(s.name),q(s.organization_name),s.rank,s.points].join(",")+")").join(",\n")+"\n ) as v(name,organization,place,points)");
const name=n=>d.standings.find(s=>s.start_number===n).name;
sql=sql.replace(/for r in select \* from \(values\n[\s\S]*?\n \) as v\(white_name,black_name,round_name,white_score,black_score\)/,match=>{
// The first values loop is also matched: retain it through its end before the fixture loop.
const marker="for r in select * from (values\n";
const last=match.lastIndexOf(marker);
return match.slice(0,last)+marker+approved.map(g=>"("+[q(name(g.white_start_number)),q(name(g.black_start_number)),q(g.round+"-р өрөг · "+g.board+"-р ширээ"),g.white_score,g.black_score].join(",")+")").join(",\n")+"\n ) as v(white_name,black_name,round_name,white_score,black_score)";
});
await writeFile("supabase/seeds/buuruljuutcup2026_chess_women.sql",sql);
console.log("Prepared women: "+d.standings.length+" standings, "+approved.length+" games.");
