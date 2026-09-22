# Tournament

Монгол хэлтэй тэмцээн зохион байгуулах платформын танилцуулгын эхний хувилбар.

## Ажиллуулах

Node.js 20.9+ ашиглана (боломжтой бол идэвхтэй LTS хувилбар).

```sh
npm ci
npm run dev
```

http://localhost:3000 хаягаар нээнэ.

```sh
npm run lint
npm run typecheck
npm run build
```

## Одоогийн хамрах хүрээ

- Next.js App Router, TypeScript, CSS, локал Manrope Variable фонт.
- Монгол landing page, responsive цэс, баг/хуваарь/шатлалын интерактив жишээ, FAQ.
- `/tournaments`, `/login`, `/register` холбоосууд нээгдэхээр бэлтгэсэн хүлээлгийн хуудсууд.
- Жишээ баг, оноо нь бодит тэмцээний мэдээлэл биш бөгөөд UI дээр тэмдэглэгээтэй.
- Supabase холболт, бодит бүртгэл/нэвтрэлт, тэмцээний өгөгдөл хараахан нэмээгүй. Landing page ажиллуулахад нууц түлхүүр эсвэл environment variable шаардлагагүй.

## Файлын бүтэц

- `src/app/page.tsx` — нүүр хуудасны агуулга.
- `src/components/` — цэс, footer, тэмцээний жишээ болон дахин ашиглах хэсгүүд.
- `src/app/globals.css` — үндсэн загвар.
- `src/styles/responsive.css` — дэлгэцийн хэмжээнд тохируулах загвар.

## Дараагийн шат

Supabase Auth болон өгөгдлийн схемийг шаардлагын дагуу холбоно. Landing page-ийн жишээнүүдийг бодит өгөгдлийн санд автоматаар үүсгэхгүй. Нэг компани олон багтай байж болно. Компанийн нэгдсэн дүн нь сонголттой бөгөөд менежер гараар удирдах боломжтой байна.

## Browser smoke check

With the local server running, run `npm run check:ui`. It uses headless Microsoft Edge to check routes, responsive layouts at 320–1440 px, mobile navigation, keyboard tabs, FAQ interaction, console errors and axe accessibility. Screenshots are saved under `.preview/` (gitignored). Set `BROWSER_CHANNEL` to `chrome` to use an installed Chrome browser, and `PREVIEW_URL` to test another local address.
