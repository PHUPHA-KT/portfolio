# วิธีอัพ Portfolio ขึ้นเว็บฟรี

เว็บนี้เป็น static site (HTML/CSS/JS ล้วน) — ใช้ hosting ฟรีได้ทุกเจ้า ไม่ต้องมี server ของตัวเอง

---

## วิธีที่ 1: GitHub Pages (แนะนำ — ถาวร ฟรีตลอด)

ได้ URL แบบ `https://<username>.github.io/portfolio/`

### ขั้นตอน (ทำผ่านเว็บ ไม่ต้องใช้ command line)

1. สมัคร/ล็อกอิน [github.com](https://github.com)
2. กดปุ่ม **+** มุมขวาบน → **New repository**
   - Repository name: `portfolio`
   - เลือก **Public**
   - กด **Create repository**
3. ในหน้า repo กด **uploading an existing file**
   - ลากไฟล์ทั้ง 6 ไฟล์ลงไป:
     `index.html`, `style.css`, `script.js`,
     `resume.html`, `resume-en.html`, `resume.css`
   - กด **Commit changes**
4. ไปที่ **Settings** (แท็บบนของ repo) → เมนูซ้าย **Pages**
   - Source: เลือก **Deploy from a branch**
   - Branch: เลือก `main` + โฟลเดอร์ `/ (root)` → กด **Save**
5. รอ 1-2 นาที รีเฟรชหน้า Pages จะเห็นลิงก์
   `https://<username>.github.io/portfolio/`

### อัพเดตเว็บทีหลัง
เข้า repo → กดเปิดไฟล์ → ไอคอนดินสอ (Edit) → แก้ → Commit
หรือ upload ไฟล์ใหม่ทับ — เว็บอัพเดตเองใน 1-2 นาที

### (ทางเลือก) ใช้ git command line

```bash
cd C:\Users\tanap\Desktop\Claude_ai\portfolio
git init
git add index.html style.css script.js resume.html resume-en.html resume.css
git commit -m "Initial portfolio"
git branch -M main
git remote add origin https://github.com/<username>/portfolio.git
git push -u origin main
```
แล้วทำข้อ 4-5 ข้างบน

---

## วิธีที่ 2: Netlify Drop (เร็วสุด — ลากวางจบ)

1. เข้า [app.netlify.com/drop](https://app.netlify.com/drop)
2. สมัครฟรี (ใช้ email หรือ GitHub login)
3. ลากโฟลเดอร์ `portfolio` ทั้งโฟลเดอร์ลงหน้าเว็บ
4. ได้ URL ทันที เช่น `https://random-name-123.netlify.app`
5. เปลี่ยนชื่อ URL ได้ที่ Site settings → Change site name
   เช่น `phupha-portfolio.netlify.app`

อัพเดต: เข้า Deploys → ลากโฟลเดอร์ลงไปใหม่

---

## วิธีที่ 3: Cloudflare Pages / Vercel

ฟรีเหมือนกัน เหมาะถ้าจะต่อยอด custom domain ทีหลัง
ขั้นตอนคล้าย Netlify: สมัคร → เชื่อม GitHub repo หรือ upload → ได้ URL

---

## เปรียบเทียบ

| | GitHub Pages | Netlify Drop | Cloudflare Pages |
|---|---|---|---|
| ความง่าย | ปานกลาง | ง่ายสุด | ปานกลาง |
| URL | `username.github.io/portfolio` | `ชื่อ.netlify.app` | `ชื่อ.pages.dev` |
| อัพเดตผ่าน git | ✓ | ✓ (ถ้าเชื่อม repo) | ✓ |
| Custom domain ฟรี | ✓ | ✓ | ✓ |
| เหมาะกับ | ใส่ใน resume, โชว์ GitHub profile | ต้องการเร็ว | สาย dev ต่อยอด |

**แนะนำ:** GitHub Pages — recruiter สาย IT/Cyber เห็น GitHub profile ด้วย เป็น plus

---

## Resume

มี 2 ภาษา อยู่ในโฟลเดอร์เดียวกัน — เข้าถึงจากเมนู "Resume" บนหน้า portfolio

| ไฟล์ | ภาษา | URL หลัง deploy |
|---|---|---|
| `resume.html` | ไทย | `<เว็บ>/resume.html` |
| `resume-en.html` | อังกฤษ | `<เว็บ>/resume-en.html` |

**วิธีทำเป็นไฟล์ PDF ส่งสมัครงาน**
1. เปิดหน้า resume ในเบราว์เซอร์ (Chrome / Edge)
2. กดปุ่ม **พิมพ์ / บันทึกเป็น PDF** บนหน้าเว็บ (หรือ `Ctrl + P`)
3. Destination / ปลายทาง เลือก **Save as PDF**
4. เช็คว่า Paper size = **A4** และ Margins = **Default**
5. Save → ได้ PDF หน้าเดียว พื้นขาว พร้อมส่ง

> เวลา print เว็บจะสลับเป็นพื้นขาวตัวอักษรดำอัตโนมัติ ปุ่มและเมนูไม่ติดไปในไฟล์
> ถ้า PDF ออกมา 2 หน้า: ในหน้าต่าง print เปิด **More settings** แล้วตั้ง Scale เป็น 95%

---

## เช็คก่อนอัพ

- [ ] ใส่รูปโปรไฟล์จริงแทน placeholder (แก้ `<div class="portrait-ph">` ใน index.html เป็น `<img src="profile.jpg" alt="ภูผา คงถิ่น">` แล้วอัพไฟล์รูปขึ้นไปด้วย)
- [ ] เช็คอีเมลติดต่อถูกต้อง: `phuphakongtin@gmail.com`
- [ ] เปิดเว็บบนมือถือดูอีกรอบหลัง deploy
